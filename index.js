var queue = require('async/queue')
var pull = require('pull-stream')
var many = require('pull-many')
var abortable = require('pull-abortable')

function connect (sbot, messageType, opts) {
  opts = opts || {}
  messageType = Array.isArray(messageType) ? messageType : [messageType]

  return function (Collection) {
    // Setup a pull source by combining all the message type sources
    // we want to listen to. Use `opts.gte` to specify the timestamp
    // from which to start streaming...
    var source = many(messageType.map(function (type) {
      var gte = opts.gte || Date.now()
      return sbot.messagesByType({ type: type, live: true, gte: gte })
    }))

    // The worker simply inserts the content into the collection
    // optionally passing it through the provided `opts.transform`
    // function beforehand
    var worker = function (message, cb) {
      if (!message || !message.value) return cb()

      var insert = function (content) {
        if (content == null) return cb()
        Collection.insert(content, cb)
      }

      if (!opts.transform) return insert(message.value.content)

      opts.transform(message.value.content, function (err, content) {
        if (err) return cb(err)
        insert(content)
      })
    }

    var q = queue(worker, opts.concurrency || 1)

    // Messages are added to a queue to that ordering is maintained
    // when inserting into mongo. Use `opts.concurrency` to allow
    // multiple concurrent inserts
    var sink = pull.drain(function (message) {
      q.push(message)
    })

    // Allow the stream to be aborted from the outside
    var abort = abortable()

    pull(source, abort, sink)

    return abort
  }
}

module.exports = connect
