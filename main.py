__author__ = 'Dheeraj Sayala'

#imports
import cgi
import os
import datetime

from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext.webapp.util import login_required

_DEBUG = True

# models
class Bird(db.Model):
    """A registered user.

    A username is generated after checking the availability. Currently logs in using Google
    account."""
    account = db.UserProperty(auto_current_user_add=True)
    username = db.StringProperty(default='')
    about = db.StringProperty(default='')
    joined = db.DateTimeProperty(auto_now_add=True)
    protected = db.BooleanProperty(default=False)
    no_tweets = db.IntegerProperty(default=0)
    no_followers = db.IntegerProperty(default=0)
    no_following = db.IntegerProperty(default=0)

    @staticmethod
    def get_current_bird():
        user = users.get_current_user()
        bird = Bird.gql("WHERE account = :user", user=user).get()
        return bird

    @staticmethod
    def get_by_username(username):
        bird = Bird.gql("WHERE username = :username", username=username).get()
        return bird

class Relation(db.Model):
    """Who follows Whom.

    A relation is added whenever a user follows another user"""
    follower = db.ReferenceProperty(Bird, collection_name='followers')
    following = db.ReferenceProperty(Bird, collection_name='following')

class Tweet(db.Model):
    """A tweet by a bird.
    """
    message = db.StringProperty(required=True)
    published = db.DateTimeProperty(auto_now=True)
    author = db.ReferenceProperty(Bird)
    username = db.StringProperty(required=True)

# generate
class BaseRequestHandler(webapp.RequestHandler):
    """Supplies a generate method which provides common template variables
    """
    def generate(self, template_name, template_values={}):
        homepage = 'http://' + self.request.host + '/'
        values = {
                'request': self.request,
                'user' : users.get_current_user(),
                'login_url': users.create_login_url(homepage),
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
    @login_required
    def get(self):
        bird = Bird.get_current_bird()
        if not bird:
            Bird().put()
            self.redirect('/register')
        following = bird.following.fetch(0)
        tweets = Tweet.gql("WHERE author in :following ORDER BY published DESC", following=following).fetch(20)
        self.generate("timeline.html", {
            'tweets': tweets,
            'bird': bird })

class RegisterHandler(BaseRequestHandler):
    """Asks the user to select a username/handle.
    """
    @login_required
    def get(self):
        self.generate("register.html")

    def post(self):
        bird = Bird.get_current_bird()
        bird.username = cgi.escape(self.request.get('username'))
        bird.about = cgi.escape(self.request.get('about'))
        bird.put()
        self.redirect('/')

class UserTimeLineHandler(BaseRequestHandler):
    """Gets the timeline of a user.
    """
    def get(self, username):
        bird = Bird.get_by_username(username)
        if not bird:
            self.error(403)
            return
        tweets = Tweet.gql("WHERE username = :username").fetch(20)
        self.generate("timelin.html", {
            'tweets': tweets,
            'bird': bird })

class TweetHandler(BaseRequestHandler):
    """Posts a tweet."""
    def post(self):
        bird = Bird.get_current_bird()
        bird.no_tweets += 1
        bird.put()
        Tweet(message=self.request.get('message'),
                author=bird,
                username=bird.username).put()
        self.redirect(self.request.get('next'))

class FollowHandler(BaseRequestHandler):
    """Adds a relation."""
    def post(self, username):
        follower = Bird.get_current_bird()
        follower.no_following += 1
        following = Bird.get_by_username(username)
        following.no_followers += 1
        follower.put()
        following.put()
        Relation(follower=follower, following=following).put()
        self.redirect(self.request.get('next'))

class PublicTimeLineHandler(BaseRequestHandler):
    """Shows public time line on the home page"""
    def get(self):
        public_tweets = Tweet.all().order('-published').fetch(20)
        self.response.out.write(template.render(
            'public.html',
            { 'publictweets' : public_tweets }))


_URLS = (('/', TimeLineHandler),
         ('/register', RegisterHandler),
         ('/tweet', TweetHandler),
         ('/user/(.*)', UserTimeLineHandler),
         ('/public', PublicTimeLineHandler),
         ('/follow', FollowHandler),
         )

def main():
    application = webapp.WSGIApplication(_URLS, debug=_DEBUG)
    run_wsgi_app(application)

if __name__ == '__main__':
    main()
