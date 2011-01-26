var http = require('http'),
    multipart = require('multipart'),
    sys = require('sys'),
    url = require('url'),
    fs = require("fs"),
    child = require('child_process'),
    outputName;

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

function parse_multipart(req) {
    var parser = multipart.parser();
    parser.headers = req.headers;

    // Add listeners to request, transfering data to parser
    req.addListener("data", function(chunk) {
        parser.write(chunk);
    });

    req.addListener("end", function() {
        parser.close();
    });

    return parser;
}

function upload_file(req, res) {
    req.setBodyEncoding("binary");

    var stream = parse_multipart(req);

    var fileStream = null;
    var ffmpeg;

    // Set handler for a request part received
    stream.onPartBegin = function(part) {
        sys.debug("Started part, name = " + part.name + ", filename = " + part.filename);
	outputName = part.filename + ".mp4";
	ffmpeg = child.spawn('ffmpeg', ['-y', '-i', 'pipe:0', outputName]);

	ffmpeg.addListener("output", function(data) {
	  sys.puts("out: " + data);
	});
	ffmpeg.addListener("exit", function(code) {
	  sys.puts("Child process stopped with exit code: " + code);
	});
	ffmpeg.addListener("drain", function(){
	  sys.puts("ready for more!");
	  req.resume();
	});

	ffmpeg.stderr.on('data', function(data){
		sys.puts("stderr: " + data);
	});
	ffmpeg.stdout.on('data', function(data){
		sys.puts("strout: " + data);
	});
    };

    // Set handler for a request part body chunk received
    stream.onData = function(chunk) {
	ffmpeg.stdin.write(chunk, "binary");
    };

    // Set handler for request completed
    stream.onEnd = function() {
            upload_complete(res);
    };
}

function upload_complete(res) {
    sys.debug("Request complete");

    // Render response
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write("<a href='"+outputName + "'>Thanks for playing!</a>");
    res.end();

    sys.puts("\n=> Done");
}

function show_404(req, res) {
  res.writeHead(404, {'Content-Type': 'text/plain'});
  res.write('You r doing it rong!');
  res.end();
}
