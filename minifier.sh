cat static/css/reset.css static/css/style.css | yui-compressor --type css -o static/css/style.min.css
cat static/js/plugins.js static/js/script.js | yui-compressor --type js -o static/js/script.min.js
