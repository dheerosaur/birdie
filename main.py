#The main handler.
__author__ = 'Dheeraj Sayala'


#imports
import cgi
import os
import datetime
import re

os.environ['DJANGO_SETTINGS_MODULE'] = 'settings'
from google.appengine.dist import use_library
use_library('django', '1.2')

from hashlib import md5
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app
from django.utils import simplejson as json

#regex
regex_whitespace = re.compile(r"\s+")
regex_username = re.compile(r"^[a-z][a-z0-9_]{1,15}$")
_DEBUG = True

#utilities
def req_login(handler_method):
    """A decorator which redirects the get requests to pages that require login to /public
    """
    def check_login(self, *args):
        if self.request.method != "GET":
            raise webapp.Error("Can be used only with GET requests")

        user = users.get_current_user()
        if not user:
            self.redirect('/public')
            return
        else:
            handler_method(self, *args)
    return check_login

def follow_unfollow(username):
    follower = Bird.get_current_bird()
    following = Bird.get_by_username(username)

    if not follower or not following:
        return "Something wrong"

    if username in follower.following_list:
        follower.following_list.remove(username)
        follower.no_following -= 1
    else:
        follower.following_list.append(username)
        follower.no_following += 1

    follower_name = follower.username
    if follower_name in following.followers_list:
        following.followers_list.remove(follower_name)
        following.no_followers -= 1
    else:
        following.followers_list.append(follower_name)
        following.no_followers += 1

    follower.put()
    following.put()
    return following.no_followers

# models
class Bird(db.Model):
    """A registered user.

    A username is generated after checking the availability. Currently logs in using Google
    account."""
    account = db.UserProperty(auto_current_user_add=True)
    username = db.StringProperty(required=True)
    about = db.StringProperty()
    email_hash = db.StringProperty(required=True)
    joined = db.DateTimeProperty(auto_now_add=True)
    protected = db.BooleanProperty(default=False)
    no_tweets = db.IntegerProperty(default=0)
    no_followers = db.IntegerProperty(default=0)
    no_following = db.IntegerProperty(default=0)
    followers_list = db.ListProperty(str)
    following_list = db.ListProperty(str)

    @staticmethod
    def get_current_bird():
        user = users.get_current_user()
        bird = Bird.gql("WHERE account = :user", user=user).get()
        return bird

    @staticmethod
    def get_by_username(username):
        bird = Bird.gql("WHERE username = :username", username=username).get()
        return bird

class Tweet(db.Model):
    """A tweet by a bird.
    """
    message = db.StringProperty(required=True)
    published = db.DateTimeProperty(auto_now=True)
    author = db.ReferenceProperty(Bird)
    username = db.StringProperty(required=True)
    email_hash = db.StringProperty(required=True)

    @staticmethod
    def post_message(msg):
        """Posts tweet
        """
        bird = Bird.get_current_bird()
        username, email_hash = bird.username, bird.email_hash
        Tweet(message=msg,
                author=bird,
                username=username,
                email_hash=email_hash).put()
        bird.no_tweets += 1
        bird.put()
        return username, email_hash, bird.no_tweets

# generate
class BaseRequestHandler(webapp.RequestHandler):
    """Supplies a generate method which provides common template variables
    """
    def generate(self, template_name, template_values={}, login_redirect=False):
        homepage = 'http://' + self.request.host + '/'
        values = {
                'error': self.request.get('error'),
                'request': self.request,
                'user' : users.get_current_user(),
                'login_url': users.create_login_url(login_redirect or self.request.uri),
                'logout_url': users.create_logout_url(homepage)
                }
        values.update(template_values)
        directory = os.path.dirname(__file__)
        path = os.path.join(directory, os.path.join('templates', template_name))
        self.response.out.write(template.render(path, values, debug=_DEBUG))

# handlers
class TimeLineHandler(BaseRequestHandler):
    """If the user is logged in, gets tweets of whom the user follows. Otherwise, shows the welcome
    page asking him to login.
    """
    @req_login
    def get(self):
        bird = Bird.get_current_bird()
        if not bird:
            self.redirect('/register')
            return
        following = bird.following_list
        following.append(bird.username)
        tweets = Tweet.gql("WHERE username in :following ORDER BY published DESC",
                following=following).fetch(30)
        self.generate("curr_user_timeline.html", {
            'tweets': tweets,
            'curr_bird': bird,
            'bird': bird })

class RegisterHandler(BaseRequestHandler):
    """Asks the user to select a username/handle.
    """
    @req_login
    def get(self):
        if Bird.get_current_bird():
            self.redirect('/')
            return
        self.generate('register.html', {'error': self.request.get('error')}, '/')

    def post(self):
        username = self.request.get('username').lower()
        if not regex_username.search(username):
            self.redirect('/register?error=bad+username')
            return
        if Bird.get_by_username(username):
            self.redirect('/register?error=username+exists')
            return
        about = self.request.get('about')
        if len(about) > 140:
            self.redirect('/register?error=too+long+about')
            return
        email_hash = md5(users.get_current_user().email()).hexdigest()
        bird = Bird(username=username, about=about, email_hash=email_hash)
        bird.put()
        self.redirect('/')

class UserTimeLineHandler(BaseRequestHandler):
    """Gets the timeline of a user.
    """
    def get(self, username):
        bird = Bird.get_by_username(username)
        if not bird:
            self.error(404)
            return
        tweets = bird.tweet_set.fetch(20)
        template_values = {'tweets': tweets, 'bird': bird}

        # If logged in, check if following or not
        # Also check if it's bird's own timeline
        curr_bird = Bird.get_current_bird()
        if curr_bird:
            template_values['curr_bird'] = curr_bird
            template_values['same_bird'] = (curr_bird.username == username)
            template_values['is_following'] = (bird.username in curr_bird.following_list)

        self.generate("user_timeline.html", template_values, '/')

### Non RPC Handlers
class TweetHandler(BaseRequestHandler):
    """Posts a tweet."""
    def post(self):
        msg = regex_whitespace.sub(" ", self.request.get('message'))
        if len(msg) > 140:
            self.redirect(self.request.path + "?error=a+tweet+should+be+140+characters+long")
        Tweet.post_message(cgi.escape(msg))
        self.redirect(self.request.get('next'))

class FollowHandler(BaseRequestHandler):
    """Follows <username>"""
    def post(self):
        follow_unfollow(self.request.get('username'))
        self.redirect(self.request.get('next'))

### End of Non RPC Handlers

class PublicTimeLineHandler(BaseRequestHandler):
    """Shows public time line on the home page"""
    def get(self):
        public_tweets = Tweet.all().order('-published').fetch(20)
        curr_bird = Bird.get_current_bird()
        self.generate('public.html',
            { 'public_tweets' : public_tweets,
              'curr_bird': curr_bird,
              }, '/')

class FolsHandler(BaseRequestHandler):
    """Shows followers or following of a bird depending on the path"""
    @req_login
    def get(self, username):
        fols = self.request.path.split('/')[1]
        bird = Bird.get_by_username(username)
        if not bird:
            self.error(404)
            return
        self.generate('fols.html',
                { 'items': getattr(bird, fols + '_list'),
                  'fols': fols,
                  'bird': bird,
                  }, '/')

class RPCHandler(webapp.RequestHandler):
    """Handles RPC requests"""
    def __init__(self):
        webapp.RequestHandler.__init__(self)
        self.methods = RPCMethods()

    def get_post(self):
        func = self.request.get('method')
        if func[0] == '_':
            self.error(403)
            return
        func = getattr(self.methods, func, None)
        if not func:
            self.error(404)
            return
        result = func(self.request)
        self.response.out.write(result)

    def get(self):
        self.get_post()

    def post(self):
        self.get_post()

class RPCMethods:
    """A collection of RPC methods

    tweet: Posts a tweet <message>
    follow: Follows or unfollows the user with <username>
    get_followers: Gets the usernames following <username>
    get_following: Gets the usernames following <username>
    """
    def tweet(self, req):
        msg = req.get('message')
        username, email_hash, no_tweets = Tweet.post_message(msg)
        return json.dumps({
                "email_hash": email_hash,
                "username": username,
                "no_tweets": no_tweets,
            })

    def follow(self, req):
        no_followers = follow_unfollow(req.get('username'))
        return json.dumps({"no_followers" : no_followers})

    def get_users_json(self, of, username):
        l = [ { 'name': item,
                'link': "/user/" + item }
            for item in getattr(Bird.get_by_username(username), of)]
        d = dict(items=l)
        return json.dumps(d)

    def get_followers(self, req):
        return self.get_users_json('followers_list', req.get('username'))

    def get_following(self, req):
        return self.get_users_json('following_list', req.get('username'))

_URLS = (('/', TimeLineHandler),
         ('/register', RegisterHandler),
         ('/tweet', TweetHandler),
         ('/follow', FollowHandler),
         ('/public', PublicTimeLineHandler),
         ('/user/(.*)', UserTimeLineHandler),
         ('/followers/(.*)', FolsHandler),
         ('/following/(.*)', FolsHandler),
         ('/rpc', RPCHandler),
         )

def main():
    application = webapp.WSGIApplication(_URLS, debug=_DEBUG)
    run_wsgi_app(application)

if __name__ == '__main__':
    main()
