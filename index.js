'use strict';
import { PassportConfigurator } from 'loopback-component-passport';
import loopback from 'loopback';
import lboot from 'loopback-boot';
import lexplorer from 'loopback-component-explorer';

import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import dotenv from 'dotenv'
dotenv.config()


class Server {
  constructor() {
    this.app = loopback()
    this.configure();
  }
  start() {
    this.passport();
    this.configureAuth();
    this.app.listen (() => {
      var baseUrl = this.app.get('url').replace(/\/$/, '');
      lexplorer(this.app, { basePath: '/api'});
      console.log('Starting REST API at %s', baseUrl);
    });
  }

  passport() {
    this.passportConfigurator = new PassportConfigurator (this.app);
    this.passportConfig = require ('./config/providers.json');
    this.passportConfigurator.init();
    this.passportConfigurator.setupModels({
     userModel: this.app.models.user,
     userIdentityModel: this.app.models.userIdentity,
     userCredentialModel: this.app.models.userCredential
    });

    this.strategies = [];
    for(var s in this.passportConfig) {
      var c = this.passportConfig[s];
      c.session = c.session !== false;
      this.strategies.push(this.passportConfigurator.configureProvider(s, c));
    }
  }
  configure() {
    lboot(this.app, {
      appConfigRootDir: 'config', 
      dsRootDir: 'config',
      componentRootDir: 'config',
      middlewareRootDir: 'middleware'
    }, err => {
      if (err) throw err;
      this.start();
    });
    // to support JSON-encoded bodies
    this.app.middleware('parse', bodyParser.json());
    // to support URL-encoded bodies
    this.app.middleware('parse', bodyParser.urlencoded({
      extended: true,
    }));
  }

  configureAuth() {
    this.app.post('/api/auth/check', (req, res, next) => {
      const userIdentity = this.app.models.userIdentity;
      const AccessToken = this.app.models.AccessToken;
      var data = req.body;
      const fields = ['email', 'picture'];
      var strategy = this.strategies.find(a => a.name === data.provider);
      strategy._profileFields = fields;
      strategy.userProfile(data.token, (error, profile) => {
        if (!error) {
          userIdentity.login (data.provider, 'oAuth 2.0', profile, {accessToken: data.token}, {}, (error, identity) => {
            if (!error) {
              AccessToken.findOne({where: {userId: identity.userId}, order: ['created DESC']}, (error, token) => {
                if (!error) {
                  token.profile = profile;
                  res.json(token);
                } else {
                  res.status(404).send ({message: 'Tokens not found', error: error})
                }
              });
            }
            else {
              res.status(404).send({message: 'User profile not found!', error: error})
            }
          });
        } else {
          res.status(500).send({message: 'Something went wrong!', error: error})
        }
      });
    });
  }
}

var snack = new Server();


