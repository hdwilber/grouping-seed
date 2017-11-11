'use string';

export default function(User) {

  User.beforeRemote('**', function (ctx, opt, next) {
    console.log(ctx.methodString)
    next();
  });

  User.beforeRemote('**.__create__groups', (ctx, opt, next) => {
    const { accessToken } = ctx.req;
    if (accessToken && accessToken.userId) {
      const data = {
        ...ctx.args.data,
        userId: accessToken.userId
      }

      const Group = User.app.models.Group;
      Group.count({
        userId: accessToken.userId, name: data.name
      }, (error, count) => {
        if (count) {
          next (new Error( "You have already this groups" ))
        } else {
          ctx.args.data  = data
          next()
        }
      })
    } else {
      next(new Error("You are not allowed to create groups"))
    }
  });

  User.afterRemote('login', function (ctx, opt, next){
    const Identity = User.app.models.userIdentity;
    const { userId } = ctx.result

    if (userId) {
      User.findById (userId, (error, user) => {
        if (!error && user) {
          Identity.findOrCreate( {where: {userId: ctx.result.userId}} , {
            userId: ctx.result.userId,
            provider: 'email',
            profile: {
              displayName: user.email, 
              emails: [{value: user.email, type: 'account'}],
              provider: 'si',
            }
          }, (error, identity) => {
            if (!error) {
              ctx.result.profile = identity.profile
              next();
            }
          });
        } else {
          cb(error)
        }
      })
    } else {
      cb("Something went wrong");
    }
  })
};
