var http = require('http');
var multipart = require('multipart');
var sys = require('sys');
var url = require('url');

var server = http.createServer(function(req, res) {
  var path = url.parse(req.url).pathname;
  sys.puts(path);
  switch (path) {
    case '/':
      display_form(req, res);
      break;
    case '/upload':
      upload_file(req, res);
      break;
    default:
      show_404(req, res);
      break;
  }
});
server.listen(8000);

function display_form(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write(
    '<form action="/upload" method="post" enctype="multipart/form-data">'+
    '<input type="file" name="upload-file">'+
    '<input type="submit" value="Upload">'+
    '</form>'
  );
  res.end();
}

function upload_file(req, res) {
var parser = multipart.parser();

    // Make parser use parsed request headers
    parser.headers = req.headers;

    // Add listeners to request, transfering data to parser

    req.addListener("data", function(chunk) {
        parser.write(chunk);
    });

    req.addListener("end", function() {
        parser.close();
    });

    return parser;




  req.setEncoding('binary');

  var stream = multipart.Stream(req);
  stream.addListener('part', function(part) {
    part.addListener('body', function(chunk) {
      var progress = (stream.bytesReceived / stream.bytesTotal * 100).toFixed(2);
      var mb = (stream.bytesTotal / 1024 / 1024).toFixed(1);

      sys.print("Uploading "+mb+"mb ("+progress+"%)\015");

      // chunk could be appended to a file if the uploaded file needs to be saved
    });
  });
  stream.addListener('complete', function() {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.sendBody('Thanks for playing!');
    res.finish();
    sys.puts("\n=> Done");
  });
}

function show_404(req, res) {
  res.writeHead(404, {'Content-Type': 'text/plain'});
  res.write('You r doing it rong!');
  res.end();
}
