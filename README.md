1. Add the mixin to your `server/model-config.json` as follows:
```json
"_meta": {
  "mixins": [
    "../node_modules/loopback-cascade-delete-mixin/lib",
    "loopback/common/mixins",
    "loopback/server/mixins",
    "../common/mixins",
    "./mixins"
  ]
}
```

Configure your `<model>.json` as follows:
```json
"relations": {
  "things": {
    "type": "hasMany",
    "model": "Thing"
  }
},
"mixins": {
  "CascadeDelete": {
    "relations": [{
      "rel" : "things"
    }]
  }
},
```
