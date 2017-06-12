var test = require('tape')
var connect = require('./')
var mongojs = require('mongojs')
var scuttlebot = require('scuttlebot')

function createSbot () {
  return scuttlebot({ temp: true })
}

function createMongo (collections) {
  return mongojs('ssb-mongo-connect-test', collections || ['posts'])
}

test('should write message to mongo collection', function (t) {
  t.plan(4)

  var sbot = createSbot()
  var db = createMongo()
  var Posts = db.collection('posts')

  var conn = connect(sbot, 'post')(Posts)
  var id = 'TEST' + Date.now()

  // Publish to sbot
  sbot.publish({ type: 'post', id: id, test: 'some' }, function (err, res) {
    t.ifError(err, 'no error publishing message')

    // Check appeared in mongo
    setTimeout(function () {
      Posts.findOne({ id: id }, function (err, post) {
        t.ifError(err, 'no error fetching post')
        t.ok(post, 'post found')
        t.equal(post.test, 'some', 'post content correct')

        db.close()
        conn.abort()
        sbot.close()

        t.end()
      })
    }, 300)
  })
})
