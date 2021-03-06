declare var require

const request = require('superagent')
const URI     = require('URIjs')
const Promise = require('bluebird')
const qs      = require('qs')

/* -----------------------------------------------------------------------------
   API Constants
   ----------------------------------------------------------------------------- */

export const Applications = {
  ATTRIBUTE:        'clustoapi.apps.attribute',
  ENTITY:           'clustoapi.apps.entity',
  RESOURCE_MANAGER: 'clustoapi.apps.resourcemanager'
}

export const Mode = {
  COMPACT:  'compact',
  EXPANDED: 'expanded'
}

export const Headers = {
  MODE:     'Clusto-Mode',
  PER_PAGE: 'Clusto-Per-Page',
  PAGE:     'Clusto-Page',
  PAGES:    'Clusto-Pages',
  MINIFY:   'Clusto-Minify'
}

export const AttributeType = {
  INTEGER:  'int',
  STRING:   'string',
  DATETIME: 'datetime',
  RELATION: 'relation',
  JSON:     'json'
}

/* -----------------------------------------------------------------------------
   API Data Types
   ----------------------------------------------------------------------------- */

export interface Attribute {
  datatype?: string
  key?: string
  number?: number
  subkey?: string
  value?: any
}

export interface Entity {
  attrs?: Attribute[]
  contents?: string[]
  driver: string
  name: string
  parents?: string[]
}

/* -----------------------------------------------------------------------------
   Method Options
   ----------------------------------------------------------------------------- */

export interface RequestOptions {
  mode?: string
  page?: number
  per_page?: number
}

export interface FromPoolsOptions extends RequestOptions {
  pool:      string|string[]
  driver?:   string|string[]
  type?:     string|string[]
  children?: boolean
}

export interface ByNameOptions extends RequestOptions {
  name: string
  driver?: string
}

export interface ByNamesOptions extends RequestOptions {
  names: string|string[]
}

export interface ByAttrOptions extends RequestOptions {
  key: string
  subkey?: string
  value?: any
}

export interface AttributeGetOptions extends RequestOptions {
  name?: string,
  key?: string,
  subkey?: string,
  number?: number
}

export interface AttributeSetOptions extends RequestOptions {
  name: string,
  key: string,
  value: any,
  subkey?: string,
  number?: number
}

export interface AttributeDeleteOptions extends RequestOptions {
  name: string,
  key: string,
  subkey?: string,
  number?: number
}

export interface EntityGetOptions extends RequestOptions {
  driver?: string
  name?: string
}

export interface EntityCreateOptions extends RequestOptions {
  driver: string
  name: string|string[]
}

export interface EntityInsertOptions extends RequestOptions {
  driver: string
  name: string
  device: string|string[]
}

export interface EntityDeleteOptions extends RequestOptions {
  driver: string
  name: string
}

export interface ResourceGetOptions extends RequestOptions {
  driver?: string
  manager?: string
}

export interface ResourceCreateOptions extends RequestOptions {
  driver: string
  name: string
  params?: { [index: string] : any }
}

export interface ResourceAllocateOptions extends RequestOptions {
  manager: string
  driver: string
  object?: string
  resource?: string
}

export interface ResourceDeleteOptions extends RequestOptions {
  driver: string
  manager: string
}

/* -----------------------------------------------------------------------------
   Client
   ----------------------------------------------------------------------------- */

export class Client {

  mount_points = new Map<string, string>()
  private _base_url: any = new URI('http://localhost:9664')

  constructor(data?: any) {
    if (data) {
      if (typeof data === 'string') {
        this._base_url = new URI(data)
      } else {
        if (data.base_url) {
          this._base_url = new URI(data.base_url)
        }
        if (data.mount_points) {
          if (Array.isArray(data.mount_points)) {
            this.mount_points = new Map<string, string>(data.mount_points)
          } else {
            for (let key of Object.keys(data.mount_points)) {
              this.mount_points.set(key, data.mount_points[key])
            }
          }
        }

      }
    }
  }

  get base_url() {
    return this._base_url.clone()
  }

  /**
   * Initialize the client, setting up the map of clusto application
   * mount points (base URL paths).
   *
   * @returns Promise<Client>
   */
  init() : Promise<Client> {
    return this.get_meta()
      .then(data => {
        this.mount_points.clear()
        for (let mount of Object.keys(data)) {
          let app = data[mount]
          this.mount_points.set(app, mount)
        }
        return this
      })
  }

  /* --------------------------------------------------
     Main module
     -------------------------------------------------- */

  /**
   * @see http://clusto-apiserver.readthedocs.org/clustoapi/all.html#clustoapi.server.version
   */
  get_version() : any {
    return this._get('/__version__')
  }

  /**
   * @see http://clusto-apiserver.readthedocs.org/clustoapi/all.html#clustoapi.server.meta
   */
  get_meta() : any {
    return this._get('/__meta__')
  }

  /**
   * @see http://clusto-apiserver.readthedocs.org/clustoapi/all.html#clustoapi.server.build_docs
   */
  get_doc() : any {
    return this._get('/__doc__')
  }

  /**
   * @see
   */
  get_driverlist() : any {
    return this._get('/driverlist')
  }

  /**
   * @see http://clusto-apiserver.readthedocs.org/clustoapi/all.html#clustoapi.server.get_from_pools
   */
  get_from_pools(opts: string|FromPoolsOptions) {
    let options : any = { params: {} }
    if (typeof opts === 'string') {
      options.params.pool = opts
    } else {
      options.params.pool = opts.pool
      options.params.driver = opts.driver
      options.params.children = opts.children
      options.mode = opts.mode
    }
    return this._get('/from-pools', options)
  }

  /**
   * @see http://clusto-apiserver.readthedocs.org/clustoapi/all.html#clustoapi.server.get_by_name
   */
  get_by_name(opts: string|ByNameOptions) {
    let options : any = { params: {} }
    let name = null
    if (typeof opts === 'string') {
      name = opts
    } else {
      name = opts.name
      if (opts.mode) {
        options.mode = opts.mode
      }
      if (opts.driver) {
        options.params.driver = opts.driver
      }
    }
    return this._get(`/by-name/${name}`, options)
  }

  /**
   * @see http://clusto-apiserver.readthedocs.org/clustoapi/all.html#clustoapi.server.get_by_names
   */
  get_by_names(opts: string[]|ByNamesOptions) {
    let options : any = { params: {} }
    if (opts instanceof Array) {
      options.params.name = opts
    } else {
      let bno = <ByNamesOptions>opts
      options.params.name = bno.names
      if (bno.mode) {
        options.mode = bno.mode
      }
    }
    return this._get('/by-names', options)
  }

  /**
   * @see http://clusto-apiserver.readthedocs.org/clustoapi/all.html#clustoapi.server.get_by_attr
   */
  get_by_attr(opts: string|ByAttrOptions) {
    let options : any = { params: {} }
    if (typeof opts === 'string') {
      options.params.key = opts
    } else {
      options.params.key = opts.key
      if (opts.subkey) {
        options.params.subkey = opts.subkey
      }
      if (opts.mode) {
        options.mode = opts.mode
      }
      if (opts.value) {
        options.params.value = opts.value
      }
    }
    return this._get('/by-attr', options)
  }

  /* --------------------------------------------------
     Attribute module
     -------------------------------------------------- */

  attribute = {
    __proto__: this,

    app: Applications.ATTRIBUTE,

    /**
     * @see http://clusto-apiserver.readthedocs.org/clustoapi/apps/all.html#clustoapi.apps.attribute.attrs
     */
    get(opts: string|AttributeGetOptions) {
      let path = new URI('')
      if (typeof opts === 'string') {
        path.segment(opts) /* name */
      } else {
        path.segment(opts.name)
        if (opts.key) {
          path.segment(opts.key)
        }
        if (opts.subkey) {
          path.segment(opts.subkey)
        }
        if (opts.number) {
          path.segment(opts.number)
        }
      }
      return this._get(path.toString(), {
        app: this.app
      })
    },

    /**
     * Add attributes to an entity.
     *
     * @see http://clusto-apiserver.readthedocs.org/clustoapi/apps/all.html#clustoapi.apps.attribute.add_attr
     */
    add(opts: AttributeSetOptions) {
      let path = `/${opts.name}`
      let options : any = {
        app: this.app,
        mode: opts.mode,
        params: {
          key: opts.key,
          value: opts.value
        }
      }
      if (opts.subkey) {
        options.params.subkey = opts.subkey
      }
      if (opts.number) {
        options.params.number = opts.number
      }
      return this._post(path, options)
    },

    /**
     * Update attributes on an entity.
     *
     * @see http://clusto-apiserver.readthedocs.org/clustoapi/apps/all.html#clustoapi.apps.attribute.set_attr
     */
    set(opts: AttributeSetOptions) {
      let path = new URI('')
        .segment(opts.name)
        .segment(opts.key)
      if (opts.subkey) {
        path.segment(opts.subkey)
      }
      if (opts.number) {
        path.segment(opts.number)
      }
      let options = {
        app: this.app,
        mode: opts.mode,
        params: {
          value: opts.value
        }
      }
      return this._put(path, options)
    },

    /**
     * Remove attributes from an entity.
     *
     * @see http://clusto-apiserver.readthedocs.org/clustoapi/apps/all.html#clustoapi.apps.attribute.del_attrs
     */
    delete(opts: AttributeDeleteOptions) {
      let path = new URI('')
        .segment(opts.name)
        .segment(opts.key)
      if (opts.subkey) {
        path.segment(opts.subkey)
      }
      if (opts.number) {
        path.segment(opts.number)
      }
      return this._delete(path.toString(), {
        app: this.app
      })
    }
  }

  /* --------------------------------------------------
     Entity module
     -------------------------------------------------- */

  entity = {
    __proto__: this,

    app: Applications.ENTITY,

    /**
     * @see http://clusto-apiserver.readthedocs.org/clustoapi/apps/all.html#clustoapi.apps.entity.list
     * @see http://clusto-apiserver.readthedocs.org/clustoapi/apps/all.html#clustoapi.apps.entity.show
     */
    get(opts?: string|EntityGetOptions) {
      let path = new URI('')
      let options : EntityGetOptions = (typeof opts === 'string') ? { driver: opts } : opts || {}
      if (options.driver) {
        path.segment(options.driver)
      }
      if (options.name) {
        path.segment(options.name)
      }
      return this._get(path.toString(), {
        app: this.app,
        mode: options.mode
      })
    },

    /**
     * @see http://clusto-apiserver.readthedocs.org/clustoapi/apps/all.html#clustoapi.apps.entity.create
     */
    create(opts: EntityCreateOptions) {
      let path = `/${opts.driver}`
      return this._post(path, {
        mode: opts.mode,
        app: this.app,
        params: {
          name: opts.name
        }
      })
    },

    /**
     * @see http://clusto-apiserver.readthedocs.org/clustoapi/apps/all.html#clustoapi.apps.entity.action
     */
    insert(opts: EntityInsertOptions) {
      let path = `/${opts.driver}/${opts.name}`
      return this._post(path, {
        mode: opts.mode,
        app: this.app,
        params: {
          device: opts.device,
          action: 'insert'
        }
      })
    },

    /**
     * @see http://clusto-apiserver.readthedocs.org/clustoapi/apps/all.html#clustoapi.apps.entity.action
     */
    remove(opts: EntityInsertOptions) {
      let path = `/${opts.driver}/${opts.name}`
      return this._post(path, {
        mode: opts.mode,
        app: this.app,
        params: {
          device: opts.device,
          action: 'remove'
        }
      })
    },

    /**
     * @see http://clusto-apiserver.readthedocs.org/clustoapi/apps/all.html#clustoapi.apps.entity.delete
     */
    delete(opts: EntityDeleteOptions) {
      let path = new URI('')
        .segment(opts.driver)
        .segment(opts.name)
      return this._delete(path.toString(), {
        app: this.app
      })
    }
  }

  /* --------------------------------------------------
     Resource manager module
     -------------------------------------------------- */

  resource = {
    __proto__: this,

    app: Applications.RESOURCE_MANAGER,

    /**
     * @see http://clusto-apiserver.readthedocs.org/clustoapi/apps/all.html#clustoapi.apps.resourcemanager.list
     * @see http://clusto-apiserver.readthedocs.org/clustoapi/apps/all.html#clustoapi.apps.resourcemanager.show
     */
    get(opts?: string|ResourceGetOptions) {
      let path = new URI('')
      let options : ResourceGetOptions = (typeof opts === 'string') ? { driver: opts } : opts || {}
      if (options.driver) {
        path.segment(options.driver)
      }
      if (options.manager) {
        path.segment(options.manager)
      }
      return this._get(path.toString(), {
        app: this.app,
        mode: options.mode
      })
    },

    /**
     * @see http://clusto-apiserver.readthedocs.org/clustoapi/apps/all.html#clustoapi.apps.resourcemanager.create
     */
    create(opts: ResourceCreateOptions) {
      let path = `/${opts.driver}`
      let options : any = {
        app: this.app,
        mode: opts.mode,
        params: {
          name: opts.name
        }
      }
      if (opts.params) {
        for (let key of Object.keys(opts.params)) {
          options.params[key] = opts.params[key]
        }
      }
      return this._post(path, options)
    },

    /**
     * @see http://clusto-apiserver.readthedocs.org/clustoapi/apps/all.html#clustoapi.apps.resourcemanager.allocate
     */
    allocate(opts: ResourceAllocateOptions) {
      let path =`/${opts.driver}/${opts.manager}`
      let thing = opts.driver || opts.object
      let options : any = {
        app: this.app,
        mode: opts.mode,
        params: {}
      }
      if (opts.object) {
        options.params.object = opts.object
      }
      if (opts.resource) {
        options.params.resource = opts.resource
      }
      return this._post(path, options)
    },

    /**
     * @see http://clusto-apiserver.readthedocs.org/clustoapi/apps/all.html#clustoapi.apps.resourcemanager.deallocate
     */
    deallocate(opts: ResourceDeleteOptions) {
      let path = new URI('')
        .segment(opts.driver)
        .segment(opts.manager)
      return this._delete(path.toString(), {
        app: this.app
      })
    }
  }

  /* ----------------------------------------
     Internal helpers
     ---------------------------------------- */

  _get(path: string, options?: any) : any {
    return this._request('GET', path, options)
  }

  _delete(path: string, options?: any) : any {
    return this._request('DELETE', path, options)
  }

  _post(path: string, options?: any) : any {
    return this._request('POST', path, options)
  }

  _put(path: string, options?: any) : any {
    return this._request('PUT', path, options)
  }

  _request(method: string, path: string, options?: any) : any /* Promise */ {
    // Build request URL
    let url = this.base_url

    if (options && options.app) {
      url.segment(this.mount_points.get(options.app))
    }

    url.segment(path)
      .normalizePath()

    let req = request(method, url.toString())
      .set('Clusto-Minify', true)
      .set('Accept', 'application/json')
    if (options && options.mode) {
      req.set(Headers.MODE, options.mode)
    }
    if (options && options.page) {
      req.set(Headers.PAGE, options.page)
    }
    if (options && options.per_page) {
      req.set(Headers.PER_PAGE, options.per_page)
    }

    // Query string
    if ((method ==='GET') && options && options.params) {
      req.query(qs.stringify(options.params, { indices: false }))
    }

    if ((method === 'POST' || method === 'PUT') && options && options.params) {
      req.set('Content-Type', 'application/x-www-form-urlencoded')
        .send(options.params)
    }

    return new Promise((resolve, reject) => {
      req.end((err, res) => {
        if (err) {
          reject(err)
        } else {
          resolve(res.body)
        }
      })
    })
  }
}
