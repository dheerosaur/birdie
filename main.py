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

# generate

# handlers

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
