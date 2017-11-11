const RoleResolver = function (app) {
  var Role = app.models.Role;
  Role.registerResolver('groupAdmin', function (role, context, cb) {
    function reject() {
      process.nextTick (function () {
        cb(null, false);
      })
    }

    if (context.modelName !== 'Group' || !accessToken.userId) {
      reject()
    } else {
      const { model, modelId, accessToken } = context;

      model.findById (modelId, (error, group) => {
        group.owner.get().then (res => {
          if (res.userId.equals(accessToken.userId)) {
            cb(null, true)
          } else {
            reject()
          }
        })
      });
    }
  });

  Role.registerResolver('boardAdmin', function (role, context, cb) {
    const { model, modelName, modelId, accessToken } = context
    function reject() {
      process.nextTick(function() {
        cb(null, false);
      });
    }

    if (modelName !== 'Board' || !accessToken.userId ) {
      reject()
    } else {
      model.findById(modelId, (error, board) => {
        if (!error) {
          if (board.userId.equals(accessToken.userId)){
            cb(null, true)
          } else {
            reject()
          }
        } else {
          reject()
        }
      })
    }
  })

  Role.registerResolver('boardMember', function (role, context, cb) {
    const { model, modelName, modelId, accessToken } = context
    function reject() {
      process.nextTick(function() {
        cb(null, false);
      });
    }

    if (modelName !== 'Board' || !accessToken.userId ) {
      reject()
    } else {
      model.findById(modelId, (error, board) => {
        if (!error) {
          app.models.Group.findById (board.groupId, (error, group) => {
            if (!error) {
              const { accessToken } = context
              group.people.exists(accessToken.userId, (error, exists) => {
                if (exists) {
                  cb(null, true)
                } else {
                  // If it is owner, allows too
                  if (group.userId.equals(accessToken.userId)) {
                    cb(null, true)
                  } else {
                    reject()
                  }
                }
              })
            } else {
              reject()
            }
          })
        } else {
          reject()
        }
      })
    }
    
  })

  Role.registerResolver('groupMember', function(role, context, cb) {
    const { model, modelName, modelId, accessToken } = context

    function reject() {
      process.nextTick(function() {
        cb(null, false);
      });
    }

    if (modelName !== 'Group' || !accessToken.userId ) {
      reject()
    } else {
      model.findById (modelId, (error, group) => {
        if (!error) {
          const { accessToken } = context
          group.people.exists(accessToken.userId, (error, exists) => {
            if (exists) {
              cb(null, true)
            } else {
              // If it is owner, allows too
              if (group.userId.equals(accessToken.userId)) {
                cb(null, true)
              } else {
                reject()
              }
            }
          })
        } else {
          reject()
        }
      })
    }
  });
};

export default RoleResolver 
