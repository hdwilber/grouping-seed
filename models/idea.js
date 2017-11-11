'use strict';

export default function(Idea) {

  Idea.observe('before save', function (ctx, next) {
    if (ctx.isNewInstance) {
      ctx.instance.createdAt = new Date();
      ctx.instance.updatedAt = ctx.instance.created;
    } else {
      ctx.data.updatedAt = new Date();
    }
    next();
  });

  Idea.afterRemote('find', function( ctx, modelInstance, next) {
    next();
  });

  Idea.beforeRemote('*.__create__comments', function (ctx, opt, next) {
    ctx.args.data.userId = ctx.req.accessToken.userId;
    next();
  });

  Idea.beforeRemote('create', function (ctx, opt, next) {
    Idea.findOrCreate( {where: { and: [{userId: ctx.req.accessToken.userId}, {published: 0 } ]}},
      {
        userId : ctx.req.accessToken.userId,
      },
      (error, idea, created) => {
        if (!error) {
          ctx.res.json ({
            idea: idea,
            status: created ? 'created': 'found',
            messages: [{
              type: 'info',
              code: created ? 1 : 2,
              body: created ? 'Created a new entry' : 'The entry has been retrieved from server'
            }]
          });
        } else {

        }
    });
  });

  Idea.afterRemoteError('create', function (ctx, next ) {
    next();
  });

  Idea.beforeRemote('*.__create__agrees', function(ctx, opt, next) {
    const Agree = Idea.app.models.Agree;
    
    Agree.findOrCreate( {where: { and: [{userId: ctx.req.accessToken.userId}, {ideaId: ctx.instance.id}]}},
      {
        ...ctx.args.data,
        userId : ctx.req.accessToken.userId,
        ideaId : ctx.instance.id
      },
      (error, agree, created) => {
        if (!error) {
          if (created) {
            ctx.res.json(agree)
          }
          else {
            next(new Error('Ya existe', 40))
          } 
        } else {
        }
    });
  });


  Idea.afterRemoteError('*.__create__agrees', function (ctx, next ) {
    ctx.res.json (
      {
        default: {
          result: 0,
          message: 'You have already liked it'
        }
      }
    );
  });


  Idea.remoteMethod ('upload', {
    "description": "Uploads files for a Item",
    accepts: [
      { arg: "id", type: "string", required: true},
      { arg: 'context', type: "object", http: {source:"context"} },
      { arg: 'options', type: "object", http: {source:"query"} }
    ],
    returns: {
      arg: "MediaFile", type: "object", root: true
    },
    http: {path: '/:id/upload',verb: "post"}
  });

  Idea.upload = function (id, context, options, cb) {
    Item.exists(id, function (error, exists) {
      if (!error && exists) {
        var MediaFile = Item.app.models.MediaFile;
        MediaFile.upload(context, {mediableId: id, mediableType: 'Item'}, function (error, resFile) {
          if (!error) {
            cb(null, resFile);
          } else {
            cb(error);
          }
        });
      } else {
        cb(error);
      }
    })
  };
};
