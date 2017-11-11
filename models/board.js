export default function (Board) {
  Board.beforeRemote ('**', function (ctx, opt, next) {
    console.log('-----------------------')
    console.log(ctx.methodString)
    console.log('-----------------------')
    next();
  });
}
