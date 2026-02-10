export { getTextureArrayBuffer } from './texture';

export interface CacheProviders {
  objectStore: R2Bucket;
  kvStore: KVNamespace;
}
