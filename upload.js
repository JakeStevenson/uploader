var http = require('http'),
    multipart = require('multipart'),
    sys = require('sys'),
    url = require('url'),
    fs = require("fs"),
    child = require('child_process'),
    paperboy = require('paperboy'),
    path = require('path'),
    WEBROOT = path.join(path.dirname(__filename), 'static'),
    outputName;

sys.puts("Static files at " + WEBROOT);
http.createServer(function(req, res){
  paperboy
    .deliver(WEBROOT, req, res)
    .before(function() {
      sys.puts("PAPERBOY!");
    })
    .after(function(statCode) {
      sys.puts("Delivered: " + req.url);    
    })
    .error(function(statCode, msg) {
      res.writeHead(statCode, {'Content-Type': 'text/plain'});
      res.end("Error " + statCode);
      sys.puts("Error: " + msg);
    })
  .otherwise(function(err) {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end("Error 404: File not found");
      sys.puts(err);
    });
}).listen(8080);
http.createServer(function(req, res) {
  var path = url.parse(req.url).pathname;
  sys.puts(req.url);
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
}).listen(8000); 

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
	var ffmpegArgs = ['-i', 'pipe:0', '-y', '-acodec', 'libfaac', '-ab', '96k', '-vcodec', 'libx264', '-vpre', 'medium', '-threads', '0', 'static/'+outputName];
	sys.puts(ffmpegArgs.join(' '));
	ffmpeg = child.spawn('ffmpeg', ffmpegArgs);

	ffmpeg.addListener("output", function(data) {
	  sys.puts("out: " + data);
	});
	ffmpeg.addListener("exit", function(code) {
	  upload_complete(res, req); 
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
            //upload_complete(res, req);
	    sys.puts("Complete " + req.url);
    };
}

function upload_complete(res, req) {
    sys.debug("Request complete");
    sys.puts(req.url);
    var parsed = url.parse(req.url);
    var link = "http://192.168.1.91:8080/" + outputName;

    // Render response
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write("<video controls autoplay autobuffer width='640' height='480'><source src='"+link+"'/></video>");
    //res.write("<a href='"+ link + "'>Thanks for playing!</a>");
    res.end();

    sys.puts("\n=> Done");
}

function show_404(req, res) {
  res.writeHead(404, {'Content-Type': 'text/plain'});
  res.write('You r doing it rong!');
  res.end();
}
