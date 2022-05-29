/**
 * @license
 * Copyright (c) 2022 Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */

// import * as pako from 'pako';
import { createChunkDecodeWarning } from './assert.js';
import { IDecodeContext, IPngChunk, ITgaDecodeContext, ITgaInitialDecodeContext } from '../shared/types';

export function readText(ctx: IDecodeContext, chunk: IPngChunk, textDecoder: TextDecoder | undefined, maxLength: number | undefined, offset: number, maxOffset: number, readTrailingNull: boolean, isCompressed?: boolean): { bytesRead: number, text: string } {
  const bytes = [];
  let current = 0;
  let i = 0;
  for (; maxLength === undefined || i < maxLength; i++) {
    if (!readTrailingNull && offset === maxOffset) {
      break;
    }
    try {
      current = ctx.view.getUint8(offset);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'Offset is outside the bounds of the DataView') {
        throw createChunkDecodeWarning(chunk, 'EOF while reading text', offset);
      }
      throw e;
    }
    // Only check if not compressed as 0 is valid is deflated data
    if (!isCompressed && current === 0) {
      break;
    }
    offset++;
    bytes.push(current);
  }

  if (readTrailingNull && ctx.view.getUint8(offset) !== 0) {
    throw createChunkDecodeWarning(chunk, 'No null character after text', offset);
  }

  const typedArray: Uint8Array = new Uint8Array(bytes);
  // if (isCompressed) {
  //   const inflator = new pako.Inflate();
  //   inflator.push(typedArray);
  //   if (inflator.err) {
  //     throw createChunkDecodeWarning(chunk, `Inflate error: ${inflator.msg}`, offset);
  //   }
  //   typedArray = inflator.result as Uint8Array;
  // }

  return { text: textDecoder ? textDecoder.decode(typedArray) : String.fromCharCode(...bytes), bytesRead: i + 1 };
}

export function readTextTga(ctx: ITgaDecodeContext, textDecoder: TextDecoder | undefined, maxLength: number, isCompressed?: boolean): string {
  const bytes = [];
  let current = 0;
  let i = 0;
  const startOffset = ctx.reader.offset;
  for (; i < maxLength; i++) {
    try {
      current = ctx.reader.view.getUint8(ctx.reader.offset);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'Offset is outside the bounds of the DataView') {
        // TODO: Warn
        // throw createChunkDecodeWarning(chunk, 'EOF while reading text', offset);
      }
      throw e;
    }
    // Only check if not compressed as 0 is valid is deflated data
    if (!isCompressed && current === 0) {
      break;
    }
    ctx.reader.offset++;
    bytes.push(current);
  }
  ctx.reader.offset = startOffset + maxLength;
  if (textDecoder) {
    return textDecoder.decode(new Uint8Array(bytes));
  }
  return String.fromCharCode(...bytes);
}
