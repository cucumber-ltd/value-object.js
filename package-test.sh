rm -rf dist && ./node_modules/.bin/babel src --out-dir dist && cp -r test dist && ./node_modules/.bin/mocha dist/test
