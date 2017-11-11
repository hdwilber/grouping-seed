'use strict';

export default function(Comment) {
  Comment.observe('before save', function (ctx, next) {
    console.log('asdfasdfasdfasdfafdafsdo')
    console.log(ctx.methodString);
    if (ctx.isNewInstance) {
      ctx.instance.createdAt = new Date();
      ctx.instance.updatedAt = ctx.instance.created;
    } else {
      ctx.data.updatedAt = new Date();
    }
    next();
  });
};
