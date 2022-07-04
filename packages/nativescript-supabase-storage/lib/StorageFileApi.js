import { get, post, remove } from './fetch';
import { isBrowser } from './helpers';
import { Http, HTTPFormData, HTTPFormDataEntry } from '../vendor/nativescript-http';
const DEFAULT_SEARCH_OPTIONS = {
    limit: 100,
    offset: 0,
    sortBy: {
        column: 'name',
        order: 'asc',
    },
};
const DEFAULT_FILE_OPTIONS = {
    cacheControl: '3600',
};
export class StorageFileApi {
    constructor(url, headers = {}, bucketId) {
        this.url = url;
        this.headers = headers;
        this.bucketId = bucketId;
    }
    /**
     * Uploads a file to an existing bucket.
     *
     * @param path The relative file path. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
     * @param file The File object to be stored in the bucket.
     * @param fileOptions HTTP headers. For example `cacheControl`
     */
    async upload(path, file, fileOptions) {
        var _a, _b;
        try {
            if (!isBrowser())
                throw new Error('No browser detected.');
            const formData = new HTTPFormData();
            const options = { ...DEFAULT_FILE_OPTIONS, ...fileOptions };
            formData.append('cacheControl', options.cacheControl);
            let fileData;
            if (typeof file === 'string') {
                if (global.isAndroid) {
                    fileData = new HTTPFormDataEntry(new java.io.File(file));
                }
                else if (global.isIOS) {
                    fileData = new HTTPFormDataEntry(NSData.dataWithContentsOfURL(NSURL.URLWithString(file)));
                }
            }
            else if (file instanceof File) {
                fileData = new HTTPFormDataEntry(file, file.name, file.type);
            }
            else {
                fileData = new HTTPFormDataEntry(file);
            }
            formData.append('', fileData);
            const _path = this._getFinalPath(path);
            const res = await Http.request({
                method: 'POST',
                url: `${this.url}/object/${_path}`,
                content: formData,
                headers: { ...this.headers }
            });
            if (res.statusCode >= 200 && res.statusCode <= 299) {
                // @ts-ignore
                res.ok = true;
            }
            // @ts-ignore
            if (res.ok) {
                // const data = await res.json()
                // temporary fix till backend is updated to the latest storage-api version
                return { data: { Key: _path }, error: null };
            }
            else {
                const error = await ((_b = (_a = res.content) === null || _a === void 0 ? void 0 : _a.toJSON) === null || _b === void 0 ? void 0 : _b.call(_a));
                return { data: null, error };
            }
        }
        catch (error) {
            return { data: null, error };
        }
    }
    /**
     * Replaces an existing file at the specified path with a new one.
     *
     * @param path The relative file path. Should be of the format `folder/subfolder`. The bucket already exist before attempting to upload.
     * @param file The file object to be stored in the bucket.
     * @param fileOptions HTTP headers. For example `cacheControl`
     */
    async update(path, file, fileOptions) {
        var _a, _b;
        try {
            if (!isBrowser())
                throw new Error('No browser detected.');
            const formData = new HTTPFormData();
            const options = { ...DEFAULT_FILE_OPTIONS, ...fileOptions };
            formData.append('cacheControl', options.cacheControl);
            let fileData;
            if (typeof file === 'string') {
                if (global.isAndroid) {
                    fileData = new HTTPFormDataEntry(new java.io.File(file));
                }
                else if (global.isIOS) {
                    fileData = new HTTPFormDataEntry(NSURL.URLWithString(file));
                }
            }
            else if (file instanceof File) {
                fileData = new HTTPFormDataEntry(file, file.name, file.type);
            }
            else {
                fileData = new HTTPFormDataEntry(file);
            }
            formData.append('', fileData);
            const _path = this._getFinalPath(path);
            const res = await Http.request({
                method: 'PUT',
                url: `${this.url}/object/${_path}`,
                content: formData,
                headers: { ...this.headers }
            });
            if (res.statusCode >= 200 && res.statusCode <= 299) {
                // @ts-ignore
                res.ok = true;
            }
            // @ts-ignore
            if (res.ok) {
                // const data = await res.json()
                // temporary fix till backend is updated to the latest storage-api version
                return { data: { Key: _path }, error: null };
            }
            else {
                const error = await ((_b = (_a = res.content) === null || _a === void 0 ? void 0 : _a.toJSON) === null || _b === void 0 ? void 0 : _b.call(_a));
                return { data: null, error };
            }
        }
        catch (error) {
            return { data: null, error };
        }
    }
    /**
     * Moves an existing file, optionally renaming it at the same time.
     *
     * @param fromPath The original file path, including the current file name. For example `folder/image.png`.
     * @param toPath The new file path, including the new file name. For example `folder/image-copy.png`.
     */
    async move(fromPath, toPath) {
        try {
            const data = await post(`${this.url}/object/move`, { bucketId: this.bucketId, sourceKey: fromPath, destinationKey: toPath }, { headers: this.headers });
            return { data, error: null };
        }
        catch (error) {
            return { data: null, error };
        }
    }
    /**
     * Create signed url to download file without requiring permissions. This URL can be valid for a set number of seconds.
     *
     * @param path The file path to be downloaded, including the current file name. For example `folder/image.png`.
     * @param expiresIn The number of seconds until the signed URL expires. For example, `60` for a URL which is valid for one minute.
     */
    async createSignedUrl(path, expiresIn) {
        try {
            const _path = this._getFinalPath(path);
            let data = await post(`${this.url}/object/sign/${_path}`, { expiresIn }, { headers: this.headers });
            const signedURL = `${this.url}${data.signedURL}`;
            data = { signedURL };
            return { data, error: null, signedURL };
        }
        catch (error) {
            return { data: null, error, signedURL: null };
        }
    }
    /**
     * Downloads a file.
     *
     * @param path The file path to be downloaded, including the path and file name. For example `folder/image.png`.
     */
    async download(path) {
        try {
            const _path = this._getFinalPath(path);
            const res = await get(`${this.url}/object/${_path}`, {
                headers: this.headers,
                noResolveJson: true,
            });
            const data = await res.blob();
            return { data, error: null };
        }
        catch (error) {
            return { data: null, error };
        }
    }
    /**
     * Deletes files within the same bucket
     *
     * @param paths An array of files to be deletes, including the path and file name. For example [`folder/image.png`].
     */
    async remove(paths) {
        try {
            const data = await remove(`${this.url}/object/${this.bucketId}`, { prefixes: paths }, { headers: this.headers });
            return { data, error: null };
        }
        catch (error) {
            return { data: null, error };
        }
    }
    /**
     * Get file metadata
     * @param id the file id to retrieve metadata
     */
    // async getMetadata(id: string): Promise<{ data: Metadata | null; error: Error | null }> {
    //   try {
    //     const data = await get(`${this.url}/metadata/${id}`, { headers: this.headers })
    //     return { data, error: null }
    //   } catch (error) {
    //     return { data: null, error }
    //   }
    // }
    /**
     * Update file metadata
     * @param id the file id to update metadata
     * @param meta the new file metadata
     */
    // async updateMetadata(
    //   id: string,
    //   meta: Metadata
    // ): Promise<{ data: Metadata | null; error: Error | null }> {
    //   try {
    //     const data = await post(`${this.url}/metadata/${id}`, { ...meta }, { headers: this.headers })
    //     return { data, error: null }
    //   } catch (error) {
    //     return { data: null, error }
    //   }
    // }
    /**
     * Lists all the files within a bucket.
     * @param path The folder path.
     * @param options Search options, including `limit`, `offset`, and `sortBy`.
     * @param parameters Fetch parameters, currently only supports `signal`, which is an AbortController's signal
     */
    async list(path, options, parameters) {
        try {
            const body = { ...DEFAULT_SEARCH_OPTIONS, ...options, prefix: path || '' };
            const data = await post(`${this.url}/object/list/${this.bucketId}`, body, { headers: this.headers }, parameters);
            return { data, error: null };
        }
        catch (error) {
            return { data: null, error };
        }
    }
    _getFinalPath(path) {
        return `${this.bucketId}/${path}`;
    }
}
//# sourceMappingURL=StorageFileApi.js.map