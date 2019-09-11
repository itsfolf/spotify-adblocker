var debugRequests = true;

var Proxy = require('http-mitm-proxy');
var proxy = Proxy();
var net = require('net');
var ca = require('./ca');
var path = require('path');
var colors = require('colors/safe');

var whitelist = require('../whitelist');
var blacklist = require('../blacklist');

proxy.use(Proxy.gunzip);

function blacklistIncludesHost(host) {
  var includes = false;
  blacklist.forEach(url => {
    if (url.split("/")[2].includes(host)) includes = true;
  });
  return includes;
}

function blacklistIncludesUrl(url) {
  var includes = false;
  blacklist.forEach(blacklistedUrl => {
    if (matchesWithWildcard(url, blacklistedUrl)) includes = true;
  });
  return includes;
}


function whitelistIncludesHost(host) {
  var includes = false;
  whitelist.forEach(whitelistedHost => {
    if (matchesWithWildcard(host, whitelistedHost)) includes = true;
  });
  return includes;
}

function matchesWithWildcard(str, rule) {
  var escapeRegex = (str) => str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  return new RegExp("^" + rule.split("*").map(escapeRegex).join(".*") + "$").test(str);
}

proxy.onConnect(function (req, socket, head, callback) {
  var host = req.url.split(":")[0];
  var port = req.url.split(":")[1];

  if (blacklistIncludesHost(host)) {
    if (debugRequests) console.log(colors.cyan("Host " + host + " is included in the blacklist, continuing with SSL proxying."))
    return callback();
  } else if (whitelistIncludesHost(host)) {
    if (debugRequests) console.log(colors.green('Tunneling ' + req.url + ' (whitelisted)'));
    var conn = net.connect({
      port: port,
      host: host,
      allowHalfOpen: true
    }, function () {
      conn.on('finish', () => {
        socket.destroy();
      });
      socket.on('close', () => {
        conn.end();
      });
      socket.write('HTTP/1.1 200 OK\r\n\r\n', 'UTF-8', function () {
        conn.pipe(socket);
        socket.pipe(conn);
      })
    });

    conn.on('error', function (err) {
      filterSocketConnReset(err, 'PROXY_TO_SERVER_SOCKET');
    });
    socket.on('error', function (err) {
      filterSocketConnReset(err, 'CLIENT_TO_PROXY_SOCKET');
    });
  } else if (debugRequests) {
    console.log(colors.red("Blocked request to " + req.url + " (not whitelisted)"))
  }
});

function filterSocketConnReset(err, socketDescription) {
  if (err.errno !== 'ECONNRESET') {
    console.log('Got unexpected error on ' + socketDescription, err);
  }
}

proxy.onError(function (ctx, err) {
  if (err.code === "ERR_SSL_SSLV3_ALERT_CERTIFICATE_UNKNOWN") {
    console.error(colors.red.bold("Certificate Authorithy isn't installed, the adblocker can't continue without a trusted CA, refer to https://github.com/checkium/spotify-adblock-windows/ for instructions."));
    process.exit(1);
  }
  console.error('proxy error:', err);
});

proxy.onRequest(function (ctx, callback) {
  var url = "https://" + ctx.clientToProxyRequest.headers.host + ctx.clientToProxyRequest.url;
  if (blacklistIncludesUrl(url)) {
    console.log(colors.red("Blocked request to url " + url + " (Blacklisted)"));
    ctx.proxyToClientResponse.end('');
  } else return callback();
});

proxy.onCertificateMissing = function (ctx, files, callback) {
  var hosts = files.hosts || [ctx.hostname];
  ca.generateServerCertificateKeys(hosts, function (certPEM, privateKeyPEM) {
    callback(null, {
      certFileData: certPEM,
      keyFileData: privateKeyPEM,
      hosts: hosts
    });
  });
  return this;
};


async function createCA() {
  await ca.create(path.resolve(process.cwd(), 'certs'), function (err, lca) {
    if (err) {
      console.log(err);
      return callback(err);
    }
    ca = lca;
  });
}

async function startProxy() {
  await createCA();
  
  proxy.listen({
    port: 8081
  }, e => {
    console.log(colors.green('Proxy is up and ready to operate, listen without disractions!'));
  });
}

startProxy();