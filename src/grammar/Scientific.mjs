/* eslint-disable no-bitwise */

// Divide a non-negative `num` by a positive `den`. The quotient is rounded to
// its nearest integer, or the even integer if there are two equally near
// integer.
function roundQuotientBigInt(num, den) {
  const quo = num / den;
  const rem = num % den;
  const rem2 = rem * 2n;
  if (rem2 > den || (rem2 === den && quo % 2n !== 0n)) {
    return quo + 1n;
  } else {
    return quo;
  }
}

const throwawayArray = new Float64Array(1);
const throwawayArrayInt = new Uint32Array(throwawayArray.buffer);

// Find out if the host's [[BigEndian]] is true or false, by checking the
// representation for -0.
throwawayArray[0] = -0;
const float64High = throwawayArrayInt[0] === 0 ? 1 : 0;

// Return x * 2 ** exp where x is a Number, and exp is an integer.
//
// Derived from
// https://github.com/JuliaMath/openlibm/blob/0f22aeb0a9104c52106f42ce1fa8ebe96fb498f1/src/s_scalbn.c.
//
// License:
//
//     Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
//     Developed at SunPro, a Sun Microsystems, Inc. business.
//     Permission to use, copy, modify, and distribute this
//     software is freely granted, provided that this notice
//     is preserved.
function scalb(x, exp) {
  if (x === 0 || exp === 0 || !Number.isFinite(x)) {
    return x;
  }
  if (exp >= 2000) {
    return x * Infinity;
  } else if (exp <= -2000) {
    return x * 0;
  }

  throwawayArray[0] = x;
  let origExp = (throwawayArrayInt[float64High] >>> 20) & 0x7ff;
  if (origExp === 0) {
    // x is denormalized. Multiply x by 2**54 (1 + number of mantissa bits),
    // and correspondingly reduce exp by 54.
    throwawayArray[0] *= 18014398509481984;
    exp -= 54;
    if (exp === 0) return throwawayArray[0];
    origExp = (throwawayArrayInt[float64High] >>> 20) & 0x7ff;
  }
  const newExp = origExp + exp;
  if (newExp > 0x7fe) {
    // Overflow. Return Infinity, but of the appropriate sign.
    return throwawayArray[0] * Infinity;
  }
  if (newExp > 0) {
    // Normalized, okay.
    throwawayArrayInt[float64High] ^= (origExp ^ newExp) << 20;
    return throwawayArray[0];
  }
  if (newExp <= -54) {
    // Underflow. Return 0, but of the appropriate sign.
    return throwawayArray[0] * 0;
  }
  // Denormalized result. Add 54 to newExp and multiply the resultant number by
  // 2**-54.
  throwawayArrayInt[float64High] ^= (origExp ^ (newExp + 54)) << 20;
  return throwawayArray[0] * 5.55111512312578270212e-17;
}

// Return the minimum number of bits it takes to store `bint`. This function
// assumes a host implementation on which a BigInt value cannot exceed 2^(4n),
// where n is the maximum length of a String value on that host (usually around
// 2^31, but can be up to 2^53 - 1 by spec).
function bitLengthBigInt(bint) {
  if (bint < 0n) {
    bint = -bint;
  }
  let increment = 0;
  if (bint > ((1n << 32n) - 1n)) {
    // This number is larger than 2^32 - 1, which is just huge. Let's form an
    // estimate of how many bits it requires first, accurate to the nearest
    // multiple of log2(16) = 4, by converting it to a hexadecimal string and
    // measuring the resulting length.
    const hexLength = bint.toString(16).length;
    const estimatedBitLength = (hexLength - 1) * 4;
    increment += estimatedBitLength;
    bint >>= BigInt(estimatedBitLength);
  }
  // As we are sure that bint is within the range of an unsigned 32-bit
  // integer, we can use Math.clz32().
  return 32 - Math.clz32(Number(bint)) + increment;
}

function approximateLog10BigInt(bint) {
  return bint.toString(10).length;
}

// Number of mantissa bits in a IEEE 754-2008 binary64 value.
const MANTISSA_BITS = 53;

// A class representing a decimal number in scientific notation, or otherwise
// known as a decimal floating-point number.
export default class Scientific {
  constructor(num, exp = 0n) {
    if (typeof num !== 'bigint') { // eslint-disable-line valid-typeof
      throw new TypeError('Numerator must be a BigInt');
    }
    if (typeof exp !== 'bigint') { // eslint-disable-line valid-typeof
      throw new TypeError('Numerator must be a BigInt');
    }
    this.num = num;
    this.exp = exp;
  }

  negate() {
    return new this.constructor(-this.num, this.exp);
  }

  convExp(exp) {
    if (this.exp === exp) {
      return this;
    } else if (this.exp > exp) {
      return new this.constructor(this.num * (10n ** (this.exp - exp)), exp);
    }
    throw new RangeError('Requested exponent must be less than or equal to the current exponent');
  }

  expAdd(e) {
    return new this.constructor(this.num, this.exp + e);
  }

  addSci(sci) {
    const expectedExp = this.exp < sci.exp ? this.exp : sci.exp;
    const conv1 = this.convExp(expectedExp);
    const conv2 = sci.convExp(expectedExp);
    return new this.constructor(conv1.num + conv2.num, expectedExp);
  }

  // Derived from "Easy Accurate Reading and Writing of Floating-Point Numbers"
  // by Aubrey Jaffer, <https://arxiv.org/abs/1310.8121v7>.
  toNumber() {
    if (this.num === 0n) {
      return 0;
    }

    if (this.num < 0) {
      return -new this.constructor(-this.num, this.exp).toNumber();
    }

    let { num, exp } = this;

    // According to V8, the "Maximum number of significant digits in decimal
    // representation" for a binary64 value is 772. See [1]. Let's first make
    // sure we have a reasonably small this.num (≤ 10**800) while not losing
    // accuracy, so that we can fast-path numbers with astronomical exponents.
    //
    // [1]: https://cs.chromium.org/chromium/src/v8/src/conversions.cc?l=565-571&rcl=dadf4cbe89c1e9ee9fed6181216cb4d3ba647a68
    const approximateDecimalDigits = approximateLog10BigInt(this.num);
    if (approximateDecimalDigits > 800) {
      const comp = BigInt(approximateDecimalDigits - 800);
      // We don't care about rounding as we still have quite a large margin of
      // error.
      num /= 10n ** comp;
      exp += comp;
    }

    if (exp > 310n) {
      // Largest possible value is < 2e308.
      return Infinity;
    } else if (exp < -1150n) {
      // Smallest possible value is 5e-324, but num may be at most 1e801, so we
      // are slightly more careful and only fast-path truly miniscule
      // exponents.
      return 0;
    }

    const expNum = Number(exp);
    if (expNum >= 0) {
      const numScaled = num * (5n ** exp);
      const bex = bitLengthBigInt(numScaled) - MANTISSA_BITS;
      if (bex <= 0) {
        return scalb(Number(numScaled), expNum);
      }
      const quo = roundQuotientBigInt(numScaled, 1n << BigInt(bex));
      return scalb(Number(quo), bex + expNum);
    }
    const scl = 5n ** -exp;
    let mantlen = MANTISSA_BITS;
    let bex = bitLengthBigInt(num) - bitLengthBigInt(scl) - mantlen;
    const tmp = bex + expNum + 1021 + mantlen;
    if (tmp < 0) {
      bex -= tmp + 1;
      mantlen += tmp;
    }
    const numScaled = num << BigInt(-bex);
    let quo = roundQuotientBigInt(numScaled, scl);
    if (bitLengthBigInt(quo) > mantlen) {
      bex += 1;
      quo = roundQuotientBigInt(numScaled, scl << 1n);
    }
    return scalb(Number(quo), bex + expNum);
  }
}
