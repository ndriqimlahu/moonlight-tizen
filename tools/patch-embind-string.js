'use strict';

// Patches the generated moonlight-wasm.js so that a std::string that C++ returns to JavaScript is read without writing
// to the heap. The code that Embind generates for it (fromWireType of std::string) writes a zero into the byte after the
// string and puts the old byte back when it is done, because the buffer that C++ made (malloc of 4 + length, no
// terminator) has no zero at the end. That byte is outside of the buffer, and nothing holds the lock of the allocator while
// it is written: when the length of the string is a multiple of 8, it is the lowest byte of the head of the next chunk of
// the heap, so a malloc or free of another thread that changes that head in between has its change overwritten by the old
// byte. The heap is then damaged, and the next free that looks at the head crashes with the lock of the allocator taken,
// which freezes the whole application. UTF8ToString of this Emscripten takes the number of bytes to read, so the
// terminator is not needed.
//
// Usage: node tools/patch-embind-string.js <moonlight-wasm.js>
// Runs on the Node 12 that ships with the Emscripten SDK, so it sticks to old syntax.

const fs = require('fs');

// fromWireType of std::string (UTF-8) in the output of the Samsung Emscripten 1.39.4.7, as the generated, unminified file has it
const ORIGINAL =
  'var endChar=HEAPU8[value+4+length];var endCharSwap=0;if(endChar!=0){endCharSwap=endChar;HEAPU8[value+4+length]=0}' +
  'var decodeStartPtr=value+4;for(var i=0;i<=length;++i){var currentBytePtr=value+4+i;if(HEAPU8[currentBytePtr]==0){' +
  'var stringSegment=UTF8ToString(decodeStartPtr);if(str===undefined)str=stringSegment;else{str+=String.fromCharCode(0);' +
  'str+=stringSegment}decodeStartPtr=currentBytePtr+1}}if(endCharSwap!=0)HEAPU8[value+4+length]=endCharSwap}';

// The segments end at a zero byte inside the string and at its length; the byte after the string is not read or written
const PATCHED =
  'var decodeStartPtr=value+4;for(var i=0;i<=length;++i){var currentBytePtr=value+4+i;if(i==length||HEAPU8[currentBytePtr]==0){' +
  'var stringSegment=UTF8ToString(decodeStartPtr,currentBytePtr-decodeStartPtr);if(str===undefined)str=stringSegment;else{' +
  'str+=String.fromCharCode(0);str+=stringSegment}decodeStartPtr=currentBytePtr+1}}}';

// Counts non-overlapping occurrences of a substring in the source
function occurrences(source, needle) {
  let count = 0;
  let from = 0;
  for (;;) {
    const at = source.indexOf(needle, from);
    // Stop when no further occurrence is found
    if (at < 0) {
      return count;
    }
    count++;
    from = at + needle.length;
  }
}

// Replaces the original Embind implementation only when the expected code is found exactly once
function patchEmbindString(source) {
  const found = occurrences(source, ORIGINAL);
  // Fail rather than silently applying an incomplete or ambiguous patch
  if (found !== 1) {
    throw new Error('the reading of a std::string was found ' + found + ' times, expected exactly once' +
      (occurrences(source, PATCHED) > 0 ? ' (the file may already be patched)' : ''));
  }
  // Replace the matched code with the patched implementation
  return source.replace(ORIGINAL, function() {
    return PATCHED;
  });
}

// Export the patch function and patterns so they can be tested independently
module.exports = { patchEmbindString, ORIGINAL, PATCHED };

// Run as a command-line script when invoked directly, but allow importing it without modifying files
if (require.main === module) {
  const file = process.argv[2];
  // Require the path to the generated JavaScript module as the first argument
  if (!file) {
    console.error('%c[patch-embind-string.js]', 'color: gray;', 'Usage: node patch-embind-string.js <moonlight-wasm.js>');
    process.exit(2);
  }
  try {
    fs.writeFileSync(file, patchEmbindString(fs.readFileSync(file, 'utf8')));
    console.log('%c[patch-embind-string.js]', 'color: gray;', 'Patched the reading of std::string in ' + file);
  } catch (error) {
    console.error('%c[patch-embind-string.js]', 'color: gray;', 'Unable to patch ' + file + ': ' + error.message);
    process.exit(1);
  }
}
