import { ObjectInspector } from './objects.mts';
import type { RegExpObject } from '#self';

export const RegExp = new ObjectInspector<RegExpObject>('RegExp', 'regexp', (value) => `/${value.OriginalSource.stringValue()}/${value.OriginalFlags.stringValue()}`);
