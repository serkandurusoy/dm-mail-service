import { Meteor } from 'meteor/meteor';
import { JsonRoutes } from 'meteor/simple:json-routes';
import { _ } from 'meteor/underscore';
import { Email } from 'meteor/email';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';

let rateCount = 0;

Meteor.startup(function(){
  function resetCount() {
    rateCount = 0;
  }
  Meteor.setInterval(resetCount, 3000)
})

const methods = [ 'get', 'put', 'head', 'patch', 'delete', 'connect', 'options', 'trace', 'copy', 'lock', 'mkcol', 'move', 'propfind', 'proppatch', 'unlock', 'report', 'mkactivity', 'checkout', 'merge' ];
const allMethods = methods.concat(['post']);

const redirectRoutes = ['/', '/mailer', '/mailer/*', '/*'];

const redirect = function redirect (req, res, next) {
  JsonRoutes.sendResult(res, {
    code: "303",
    headers: {
      Status: "HTTP/1.1 303 See Other",
      Location: "https://www.dragoman-turkey.com/"
    }
  });
};

JsonRoutes.setResponseHeaders({
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With"
});

redirectRoutes.forEach(path => {
  allMethods.forEach(method => {
    if (path === '/mailer' && method === 'post' ) {
      JsonRoutes.add(method, path, function(req, res, next) {
        const {body} = req;
        let result;

        try {
          result = Meteor.call('sendEmail', body)
        } catch(e) {
          console.log(e);
          result = false;
        }

        if (result && result === 'OK') {
          JsonRoutes.sendResult(res, {
            code: "200",
            data: "OK"
          })
        } else {
          JsonRoutes.sendResult(res, {
            code: "500",
            data: "ERROR"
          })
        }

      });
    } else {
      JsonRoutes.add(method, path, redirect)
    }
  });
});


function wrongKeys(body,keys) {
  const eksiklik = _.intersection(keys, _.keys(body)).length !== keys.length;
  const fazlalik = _.keys(_.omit(body, keys)).length;
  return eksiklik || fazlalik;
}

Meteor.methods({
  'sendEmail': function(body) {

    if ( rateCount <= 3 && _.isObject(body) && body.site ) {

      rateCount++;

      switch (body.site) {
        case 'misirkitabi':
          const keys = ['site', 'isim', 'eposta', 'telefon', 'adet', 'adres'];
          if (wrongKeys(body, keys)) {
            throw new Meteor.Error('not allowed')
          } else {
            sendMisirKitabiEmail(body);
          }
          break;
        case 'burayafalancayenisiteninadigelecek':
          break;
        default:
          throw new Meteor.Error('not allowed')
      }

    } else {
      throw new Meteor.Error('not allowed')
    }

    return 'OK';

  }
});

function sendMisirKitabiEmail(body) {
  const { isim, eposta, telefon, adet, adres } = body;

  new SimpleSchema({
    site: {
      type: String,
    },
    isim: {
      type: String,
      max: 255,
    },
    eposta: {
      type: String,
      max: 255,
      regEx: SimpleSchema.RegEx.Email,
    },
    telefon: {
      type: String,
      max: 255,
    },
    adet: {
      type: String,
      max: 255,
    },
    adres: {
      type: String,
      max: 255,
    }
  }).validate(body);


  Email.send({
    from: 'admin@dragoman-turkey.com',
    to: 'murat@dragoman-turkey.com',
    subject: `Misir kitabi icin siparis: ${eposta}`,
    text: `İsim: ${isim}
E-posta: ${eposta}
Telefon: ${telefon}
Adet: ${adet}
Adres: ${adres}`
  });
  
}
