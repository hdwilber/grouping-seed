'use string';

function rand() {
    return Math.random().toString(36).substr(2); 
};

export default function(Invitation) {
  Invitation.observe('before save', function (ctx, next) {
    if (ctx.isNewInstance) {
      ctx.instance.verificationCode =   rand() + rand();
      ctx.instance.createdAt = new Date();
      ctx.instance.updatedAt = ctx.instance.createdAt;
    } else {
      ctx.data.updatedAt = new Date();
    }

    next();
  });

  Invitation.checkCode = function (context, code, cb) {
    Invitation.findOne( { 
      where: { and: [{ verificationCode: code }, { status: 'sent' }] }
    }, (error, invitation) => {
      if (!error) {
        if (invitation) {
          const User = Invitation.app.models.user;
          const Group = Invitation.app.models.Group;
          // Check group 
          Group.findById(invitation.groupId, function ( error, group ) {
            if (!error ) {
              // Group found
              User.findOrCreate( { where: { email: invitation.recipientEmail } },
                {
                  email: invitation.recipientEmail,
                  password: invitation.recipientEmail,
                  username: ''
                },
                (error, user, created) => {
                  if (!error) {
                    // User created/retrieved
                    group.people.add ( user.id, function (error) {
                      if (!error ) {
                        // User added to Group
                        if (created) {
                          user.identity.create ({
                            provider: 'email',
                            authSchema: 'email',
                            profile: {
                              displayName: user.email,
                              emails: [user.email],
                              photos: [  ],
                            }
                          }, function (error, identity ) {
                            if (!error) {
                              User.login ({email: user.email, password: user.email}, function (error, session) {
                                if (!error) {
                                  const AccessToken = User.app.models.AccessToken;
                                  AccessToken.create ({
                                    userId: user.id 
                                  }, function (error, session) {
                                    if (!error) {
                                      // If new user, allows to change password
                                      cb(null, session);
                                    } else {
                                      cb( null, { error: { code: 0, message: 'Something wrong happend' } } )
                                    }
                                  });
                                }
                              });

                            }
                          });
                        } else {
                          if (!error) {
                            // If not a new user, request for login
                            cb(null, { status: 1, message: 'You can access with your own credentials' });
                          } else {
                            cb( null, { error: { code: 0, message: 'Something wrong happend' } } )
                          }
                        }
                      }
                    });
                  } else {
                    cb( error );
                  }
              });
            }
            else {
              cb(null, {
                error: {
                  code: 0,
                  message: 'Group doesnt exists'
                }
              });
            }
          });
        } else {
          cb(null, {
            error: {
              code: 0,
              message: 'Not valid invitation'
            }
          });
        }
      } else {
        cb(error);
      }
    });
  };

  Invitation.remoteMethod("checkCode", {
    "description": "Check the verification code",
    accepts: [
      { arg: 'context', type: 'object', http: { source:'context' } },
      { arg: 'code', type: 'string', required: true }
    ],
    returns: {
      arg: "url", type: "string", root: true
    },
    http: {verb: "get", path:"/:code/check"}
  });
};
