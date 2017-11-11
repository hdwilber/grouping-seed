'use strict';

export default function(Agree) {
  Agree.observe('before save', function (ctx, next) {
    if (ctx.isNewInstance) {
      ctx.instance.createdAt = new Date();
      ctx.instance.updatedAt = ctx.instance.created;
    } else {
      ctx.data.updatedAt = new Date();
    }
    next();
  });
};
