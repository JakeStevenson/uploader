var http = require('http');
var multipart = require('multipart');
var sys = require('sys');
var url = require('url');
var fs = require("fs");
var child = require('child_process')

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
}

function upload_file(req, res) {
    // Request body is binary
    req.setBodyEncoding("binary");

     
    // Handle request as multipart
    var stream = parse_multipart(req);


    var fileName = null;
    var fileStream = null;
    var ffmpeg;

    // Set handler for a request part received
    stream.onPartBegin = function(part) {
        sys.debug("Started part, name = " + part.name + ", filename = " + part.filename);
	var outputName = part.filename + ".mp4";
	ffmpeg = child.spawn('ffmpeg', ['-i', 'pipe:0', outputName]);

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
	//	req.resume();
	});
	ffmpeg.stdout.on('data', function(data){
		sys.puts("strout: " + data);
	//	req.resume();
	});
        // Construct file name
        //fileName = "./" + stream.part.filename;

        // Construct stream used to write to file
        //fileStream = fs.createWriteStream(fileName);

        // Add error handler
        //fileStream.addListener("error", function(err) {
        //    sys.debug("Got error while writing to file '" + fileName + "': ", err);
        //});

        // Add drain (all queued data written) handler to resume receiving request data
        //fileStream.addListener("drain", function() {
        //    req.resume();
        //});
    };

    // Set handler for a request part body chunk received
    stream.onData = function(chunk) {
        // Pause receiving request data (until current chunk is written)
        //req.pause();

        // Write chunk to file
        // Note that it is important to write in binary mode
        // Otherwise UTF-8 characters are interpreted
        sys.debug("Writing chunk");
        //fileStream.write(chunk, "binary");
	ffmpeg.stdin.write(chunk, "binary");
    };

    // Set handler for request completed
    stream.onEnd = function() {
        // As this is after request completed, all writes should have been queued by now
        // So following callback will be executed after all the data is written out
        //fileStream.addListener("drain", function() {
            // Close file stream
        //    fileStream.end();
            // Handle request completion, as all chunks were already written
            upload_complete(res);
        //});
    };
}

function upload_complete(res) {
    sys.debug("Request complete");

    // Render response
    res.sendHeader(200, {"Content-Type": "text/plain"});
    res.write("Thanks for playing!");
    res.end();

    sys.puts("\n=> Done");
}

function show_404(req, res) {
  res.writeHead(404, {'Content-Type': 'text/plain'});
  res.write('You r doing it rong!');
  res.end();
}
