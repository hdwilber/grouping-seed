import { sendInvitationByEmail } from '../lib/mail'

export default function(Group) {

  // Hooks
  Group.observe('before save', function (ctx, next) {
    if (ctx.isNewInstance) {
      ctx.instance.createdAt = new Date();
      ctx.instance.updatedAt = ctx.instance.createdAt;
    } else {
      ctx.data.updatedAt = new Date();
    }
    next();
  });

  // Remote hooks
  Group.beforeRemote('*.__create__invitations', function (ctx, opt, next) {
    if (ctx.instance) {
      ctx.args.data = {
        ...ctx.args.data,
        senderId: ctx.req.accessToken.userId,
        groupId: ctx.instance.id
      }
      next();
    } else {
      next(new Error('something went wrong'))
    }
  });

  Group.afterRemote('*.__create__invitations', function (ctx, opt, next) {
    if (ctx.result) {
      sendInvitationByEmail(ctx.result)
      .then( email => {
        ctx.res.json({ message: 'invitation Sent' })
      })
      .catch(error => {
        ctx.res.json({message: 'Una verga papu', error: error });
      });
    }
  });

  Group.beforeRemote('*.__create__boards', (ctx, opt, next) => {
    const group = ctx.instance
    const data = {
      ...ctx.args.data,
      userId: ctx.req.accessToken.userId
    }

    if (group) {
      const Board = Group.app.models.Board
      Board.count ({ groupId: group.id, name: data.name }, (error, count) => {
        if (count) {
          next (new Error( "Board with this name already exists" ))
        } else {
          ctx.args.data = data;
          next()
        }
      })
    } else {
      next (new Error('Something went wrong'))
    }
  });

  Group.beforeRemote ('**', function (ctx, opt, next) {
    console.log('-----------------------')
    console.log(ctx.methodString)
    console.log('-----------------------')
    next();
  });

};
