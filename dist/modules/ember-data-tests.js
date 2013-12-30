(function() {
var get = Ember.get, set = Ember.set;

var Person, adapter, store, allRecords;

module("integration/adapter/find_all - Finding All Records of a Type", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });

    allRecords = null;
  },

  teardown: function() {
    if (allRecords) { allRecords.destroy(); }
    store.destroy();
  }
});

test("When all records for a type are requested, the store should call the adapter's `findAll` method.", function() {
  expect(5);

  store = createStore({ adapter: DS.Adapter.extend({
      findAll: function(store, type, since) {
        // this will get called twice
        ok(true, "the adapter's findAll method should be invoked");

        return Ember.RSVP.resolve([{ id: 1, name: "Braaaahm Dale" }]);
      }
    })
  });

  var allRecords;

  store.find(Person).then(async(function(all) {
    allRecords = all;
    equal(get(all, 'length'), 1, "the record array's length is 1 after a record is loaded into it");
    equal(all.objectAt(0).get('name'), "Braaaahm Dale", "the first item in the record array is Braaaahm Dale");
  }));

  store.find(Person).then(async(function(all) {
    // Only one record array per type should ever be created (identity map)
    strictEqual(allRecords, all, "the same record array is returned every time all records of a type are requested");
  }));
});

test("When all records for a type are requested, a rejection should reject the promise", function() {
  expect(5);

  var count = 0;
  store = createStore({ adapter: DS.Adapter.extend({
    findAll: function(store, type, since) {
        // this will get called twice
        ok(true, "the adapter's findAll method should be invoked");

        if (count++ === 0) {
          return Ember.RSVP.reject();
        } else {
          return Ember.RSVP.resolve([{ id: 1, name: "Braaaahm Dale" }]);
        }
      }
    })
  });

  var allRecords;

  store.find(Person).then(null, async(function() {
    ok(true, "The rejection should get here");
    return store.find(Person);
  })).then(async(function(all) {
    allRecords = all;
    equal(get(all, 'length'), 1, "the record array's length is 1 after a record is loaded into it");
    equal(all.objectAt(0).get('name'), "Braaaahm Dale", "the first item in the record array is Braaaahm Dale");
  }));
});

test("When all records for a type are requested, records that are already loaded should be returned immediately.", function() {
  expect(3);

  // Load a record from the server
  store.push(Person, { id: 1, name: "Jeremy Ashkenas" });

  // Create a new, unsaved record in the store
  store.createRecord(Person, { name: "Alex MacCaw" });

  allRecords = store.all(Person);

  equal(get(allRecords, 'length'), 2, "the record array's length is 2");
  equal(allRecords.objectAt(0).get('name'), "Jeremy Ashkenas", "the first item in the record array is Jeremy Ashkenas");
  equal(allRecords.objectAt(1).get('name'), "Alex MacCaw", "the second item in the record array is Alex MacCaw");
});

test("When all records for a type are requested, records that are created on the client should be added to the record array.", function() {
  expect(3);

  allRecords = store.all(Person);

  equal(get(allRecords, 'length'), 0, "precond - the record array's length is zero before any records are loaded");

  store.createRecord(Person, { name: "Carsten Nielsen" });

  equal(get(allRecords, 'length'), 1, "the record array's length is 1");
  equal(allRecords.objectAt(0).get('name'), "Carsten Nielsen", "the first item in the record array is Carsten Nielsen");
});

})();

(function() {
var get = Ember.get, set = Ember.set;
var Person, store, adapter;

module("integration/adapter/find - Finding Records", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });
  },

  teardown: function() {
    store.destroy();
  }
});

test("When a single record is requested, the adapter's find method should be called unless it's loaded.", function() {
  expect(2);

  var count = 0;

  store = createStore({ adapter: DS.Adapter.extend({
      find: function(store, type, id) {
        equal(type, Person, "the find method is called with the correct type");
        equal(count, 0, "the find method is only called once");

        count++;
        return { id: 1, name: "Braaaahm Dale" };
      }
    })
  });

  store.find(Person, 1);
  store.find(Person, 1);
});

test("When a single record is requested multiple times, all .find() calls are resolved after the promise is resolved", function() {
  var deferred = Ember.RSVP.defer();

  store = createStore({ adapter: DS.Adapter.extend({
      find:  function(store, type, id) {
        return deferred.promise;
      }
    })
  });

  store.find(Person, 1).then(async(function(person) {
    equal(person.get('id'), "1");
    equal(person.get('name'), "Braaaahm Dale");

    stop();
    deferred.promise.then(function(value){
      start();
      ok(true, 'expected deferred.promise to fulfill');
    },function(reason){
      start();
      ok(false, 'expected deferred.promise to fulfill, but rejected');
    });
  }));

  store.find(Person, 1).then(async(function(post) {
    equal(post.get('id'), "1");
    equal(post.get('name'), "Braaaahm Dale");

    stop();
    deferred.promise.then(function(value){
      start();
      ok(true, 'expected deferred.promise to fulfill');
    }, function(reason){
      start();
      ok(false, 'expected deferred.promise to fulfill, but rejected');
    });

  }));

  Ember.run(function() {
    deferred.resolve({ id: 1, name: "Braaaahm Dale" });
  });
});

test("When a single record is requested, and the promise is rejected, .find() is rejected.", function() {
  var count = 0;

  store = createStore({ adapter: DS.Adapter.extend({
      find: function(store, type, id) {
        return Ember.RSVP.reject();
      }
    })
  });

  store.find(Person, 1).then(null, async(function(reason) {
    ok(true, "The rejection handler was called");
  }));
});

})();

(function() {
var get = Ember.get, set = Ember.set;
var env, Person, Phone, App;

module("integration/adapter/fixture_adapter - DS.FixtureAdapter", {
  setup: function() {
    Person = DS.Model.extend({
      firstName: DS.attr('string'),
      lastName: DS.attr('string'),

      height: DS.attr('number'),

      phones: DS.hasMany('phone', { async: true })
    });

    Phone = DS.Model.extend({
      person: DS.belongsTo('person')
    });

    env = setupStore({ person: Person, phone: Phone, adapter: DS.FixtureAdapter });
    env.adapter.simulateRemoteResponse = true;

    // Enable setTimeout.
    Ember.testing = false;

    Person.FIXTURES = [];
    Phone.FIXTURES = [];
  },
  teardown: function() {
    Ember.testing = true;

    env.container.destroy();
  }
});

test("should load data for a type asynchronously when it is requested", function() {
  Person.FIXTURES = [{
    id: 'wycats',
    firstName: "Yehuda",
    lastName: "Katz",

    height: 65
  },

  {
    id: 'ebryn',
    firstName: "Erik",
    lastName: "Brynjolffsosysdfon",

    height: 70,
    phones: [1, 2]
  }];

  Phone.FIXTURES = [{
    id: 1,
    person: 'ebryn'
  }, {
    id: 2,
    person: 'ebryn'
  }];

  env.store.find('person', 'ebryn').then(async(function(ebryn) {
    equal(get(ebryn, 'isLoaded'), true, "data loads asynchronously");
    equal(get(ebryn, 'height'), 70, "data from fixtures is loaded correctly");

    return Ember.RSVP.hash({ ebryn: ebryn, wycats: env.store.find('person', 'wycats') });
  }, 1000)).then(async(function(records) {
    equal(get(records.wycats, 'isLoaded'), true, "subsequent requests for records are returned asynchronously");
    equal(get(records.wycats, 'height'), 65, "subsequent requested records contain correct information");

    return get(records.ebryn, 'phones');
  }, 1000)).then(async(function(phones) {
    equal(get(phones, 'length'), 2, "relationships from fixtures is loaded correctly");
  }, 1000));
});

test("should load data asynchronously at the end of the runloop when simulateRemoteResponse is false", function() {
  Person.FIXTURES = [{
    id: 'wycats',
    firstName: "Yehuda"
  }];

  env.adapter.simulateRemoteResponse = false;

  var wycats;

  Ember.run(function() {
    env.store.find('person', 'wycats').then(function(person) {
      wycats = person;
    });
  });

  ok(get(wycats, 'isLoaded'), 'isLoaded is true after runloop finishes');
  equal(get(wycats, 'firstName'), 'Yehuda', 'record properties are defined after runloop finishes');
});

test("should create record asynchronously when it is committed", function() {
  equal(Person.FIXTURES.length, 0, "Fixtures is empty");

  var paul = env.store.createRecord('person', {firstName: 'Paul', lastName: 'Chavard', height: 70});

  paul.on('didCreate', async(function() {
    equal(get(paul, 'isNew'), false, "data loads asynchronously");
    equal(get(paul, 'isDirty'), false, "data loads asynchronously");
    equal(get(paul, 'height'), 70, "data from fixtures is saved correctly");

    equal(Person.FIXTURES.length, 1, "Record added to FIXTURES");

    var fixture = Person.FIXTURES[0];

    ok(typeof fixture.id === 'string', "The fixture has an ID generated for it");
    equal(fixture.firstName, 'Paul');
    equal(fixture.lastName, 'Chavard');
    equal(fixture.height, 70);
  }));

  paul.save();
});

test("should update record asynchronously when it is committed", function() {
  equal(Person.FIXTURES.length, 0, "Fixtures is empty");

  var paul = env.store.push('person', { id: 1, firstName: 'Paul', lastName: 'Chavard', height: 70});

  paul.set('height', 80);

  paul.on('didUpdate', async(function() {
    equal(get(paul, 'isDirty'), false, "data loads asynchronously");
    equal(get(paul, 'height'), 80, "data from fixtures is saved correctly");

    equal(Person.FIXTURES.length, 1, "Record FIXTURES updated");

    var fixture = Person.FIXTURES[0];

    equal(fixture.firstName, 'Paul');
    equal(fixture.lastName, 'Chavard');
    equal(fixture.height, 80);
  }, 1000));

  paul.save();
});

test("should delete record asynchronously when it is committed", function() {
  stop();

  var timer = setTimeout(function() {
    start();
    ok(false, "timeout exceeded waiting for fixture data");
  }, 1000);

  equal(Person.FIXTURES.length, 0, "Fixtures empty");

  var paul = env.store.push('person', { id: 'paul', firstName: 'Paul', lastName: 'Chavard', height: 70 });

  paul.deleteRecord();

  paul.on('didDelete', function() {
    clearTimeout(timer);
    start();

    equal(get(paul, 'isDeleted'), true, "data deleted asynchronously");
    equal(get(paul, 'isDirty'), false, "data deleted asynchronously");

    equal(Person.FIXTURES.length, 0, "Record removed from FIXTURES");
  });

  paul.save();
});

test("should follow isUpdating semantics", function() {
  var timer = setTimeout(function() {
    start();
    ok(false, "timeout exceeded waiting for fixture data");
  }, 1000);

  stop();

  Person.FIXTURES = [{
    id: "twinturbo",
    firstName: "Adam",
    lastName: "Hawkins",
    height: 65
  }];

  var result = env.store.findAll('person');

  result.then(function(all) {
    clearTimeout(timer);
    start();
    equal(get(all, 'isUpdating'), false, "isUpdating is set when it shouldn't be");
  });
});

test("should coerce integer ids into string", function() {
  Person.FIXTURES = [{
    id: 1,
    firstName: "Adam",
    lastName: "Hawkins",
    height: 65
  }];

  env.store.find('person', 1).then(async(function(result) {
    strictEqual(get(result, 'id'), "1", "should load integer model id as string");
  }));
});

test("should coerce belongsTo ids into string", function() {
  Person.FIXTURES = [{
    id: 1,
    firstName: "Adam",
    lastName: "Hawkins",

    phones: [1]
  }];

  Phone.FIXTURES = [{
    id: 1,
    person: 1
  }];

  env.store.find('phone', 1).then(async(function(result) {
    var person = get(result, 'person');
    person.one('didLoad', async(function() {
      strictEqual(get(result, 'person.id'), "1", "should load integer belongsTo id as string");
      strictEqual(get(result, 'person.firstName'), "Adam", "resolved relationship with an integer belongsTo id");
    }));
  }));
});

test("only coerce belongsTo ids to string if id is defined and not null", function() {
  Person.FIXTURES = [];

  Phone.FIXTURES = [{
    id: 1
  }];

  env.store.find('phone', 1).then(async(function(phone) {
    equal(phone.get('person'), null);
  }));
});

test("should throw if ids are not defined in the FIXTURES", function() {
  Person.FIXTURES = [{
    firstName: "Adam",
    lastName: "Hawkins",
    height: 65
  }];

  raises(function(){
    env.store.find('person', 1);
  }, /the id property must be defined as a number or string for fixture/);

  Person.FIXTURES = [{
    id: 0
  }];

  env.store.find('person', 0).then(async(function() {
    ok(true, "0 is an acceptable ID, so no exception was thrown");
  }), function() {
    ok(false, "should not get here");
  });
});

})();

(function() {
var get = Ember.get, set = Ember.set;
var Person, env, store, adapter;

module("integration/adapter/queries - Queries", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });

    env = setupStore({ person: Person });
    store = env.store;
    adapter = env.adapter;
  },

  teardown: function() {
    env.container.destroy();
  }
});

test("When a query is made, the adapter should receive a record array it can populate with the results of the query.", function() {
  adapter.findQuery = function(store, type, query, recordArray) {
    equal(type, Person, "the find method is called with the correct type");

    return Ember.RSVP.resolve([{ id: 1, name: "Peter Wagenet" }, { id: 2, name: "Brohuda Katz" }]);
  };

  store.find('person', { page: 1 }).then(async(function(queryResults) {
    equal(get(queryResults, 'length'), 2, "the record array has a length of 2 after the results are loaded");
    equal(get(queryResults, 'isLoaded'), true, "the record array's `isLoaded` property should be true");

    equal(queryResults.objectAt(0).get('name'), "Peter Wagenet", "the first record is 'Peter Wagenet'");
    equal(queryResults.objectAt(1).get('name'), "Brohuda Katz", "the second record is 'Brohuda Katz'");
  }));
});

})();

(function() {
var get = Ember.get, set = Ember.set, attr = DS.attr;
var Person, env, store;

var all = Ember.RSVP.all, hash = Ember.RSVP.hash, resolve = Ember.RSVP.resolve;

function assertClean(promise) {
  return promise.then(async(function(record) {
    equal(record.get('isDirty'), false, "The record is now clean");
    return record;
  }));
}


module("integration/adapter/record_persistence - Persisting Records", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: attr('string'),
      name: attr('string'),
      firstName: attr('string'),
      lastName: attr('string')
    });
    Person.toString = function() { return "Person"; };

    env = setupStore({ person: Person });
    store = env.store;
  },

  teardown: function() {
    env.container.destroy();
  }
});

test("When a store is committed, the adapter's `commit` method should be called with records that have been changed.", function() {
  expect(2);

  env.adapter.updateRecord = function(store, type, record) {
    equal(type, Person, "the type is correct");
    equal(record, tom, "the record is correct");

    return Ember.RSVP.resolve();
  };

  env.store.push('person', { id: 1, name: "Braaaahm Dale" });

  var tom;

  env.store.find('person', 1).then(async(function(person) {
    tom = person;
    set(tom, "name", "Tom Dale");
    tom.save();
  }));
});

test("When a store is committed, the adapter's `commit` method should be called with records that have been created.", function() {
  expect(2);

  env.adapter.createRecord = function(store, type, record) {
    equal(type, Person, "the type is correct");
    equal(record, tom, "the record is correct");

    return Ember.RSVP.resolve({ id: 1, name: "Tom Dale" });
  };

  var tom = env.store.createRecord('person', { name: "Tom Dale" });
  tom.save();
});

test("After a created record has been assigned an ID, finding a record by that ID returns the original record.", function() {
  expect(1);

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.resolve({ id: 1, name: "Tom Dale" });
  };

  var tom = env.store.createRecord('person', { name: "Tom Dale" });
  tom.save();

  asyncEqual(tom, env.store.find('person', 1), "the retrieved record is the same as the created record");
});

test("when a store is committed, the adapter's `commit` method should be called with records that have been deleted.", function() {
  env.adapter.deleteRecord = function(store, type, record) {
    equal(type, Person, "the type is correct");
    equal(record, tom, "the record is correct");

    return Ember.RSVP.resolve();
  };

  var tom;

  env.store.push('person', { id: 1, name: "Tom Dale" });
  env.store.find('person', 1).then(async(function(person) {
    tom = person;
    tom.deleteRecord();
    return tom.save();
  })).then(async(function(tom) {
    equal(get(tom, 'isDeleted'), true, "record is marked as deleted");
  }));
});

test("An adapter can notify the store that records were updated by calling `didSaveRecords`.", function() {
  expect(6);

  var tom, yehuda;

  env.adapter.updateRecord = function(store, type, record) {
    return Ember.RSVP.resolve();
  };

  env.store.push('person', { id: 1 });
  env.store.push('person', { id: 2 });

  all([ env.store.find('person', 1), env.store.find('person', 2)  ])
    .then(async(function(array) {
      tom = array[0];
      yehuda = array[1];

      tom.set('name', "Michael Phelps");
      yehuda.set('name', "Usain Bolt");

      ok(tom.get('isDirty'), "tom is dirty");
      ok(yehuda.get('isDirty'), "yehuda is dirty");

      assertClean(tom.save()).then(async(function(record) {
        equal(record, tom, "The record is correct");
      }));

      assertClean(yehuda.save()).then(async(function(record) {
        equal(record, yehuda, "The record is correct");
      }));
    }));
});

test("An adapter can notify the store that records were updated and provide new data by calling `didSaveRecords`.", function() {
  var tom, yehuda;

  env.adapter.updateRecord = function(store, type, record) {
    if (record.get('id') === "1") {
      return Ember.RSVP.resolve({ id: 1, name: "Tom Dale", updatedAt: "now" });
    } else if (record.get('id') === "2") {
      return Ember.RSVP.resolve({ id: 2, name: "Yehuda Katz", updatedAt: "now!" });
    }
  };

  env.store.push('person', { id: 1, name: "Braaaahm Dale" });
  env.store.push('person', { id: 2, name: "Gentile Katz" });

  hash({ tom: env.store.find('person', 1), yehuda: env.store.find('person', 2) }).then(async(function(people) {
    people.tom.set('name', "Draaaaaahm Dale");
    people.yehuda.set('name', "Goy Katz");

    return hash({ tom: people.tom.save(), yehuda: people.yehuda.save() });
  })).then(async(function(people) {
    equal(people.tom.get('name'), "Tom Dale", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(people.tom.get('updatedAt'), "now", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
    equal(people.yehuda.get('name'), "Yehuda Katz", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(people.yehuda.get('updatedAt'), "now!", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
  }));
});

test("An adapter can notify the store that a record was updated by calling `didSaveRecord`.", function() {
  env.adapter.updateRecord = function(store, type, record) {
    return Ember.RSVP.resolve();
  };

  store.push('person', { id: 1 });
  store.push('person', { id: 2 });

  hash({ tom: store.find('person', 1), yehuda: store.find('person', 2) }).then(async(function(people) {
    people.tom.set('name', "Tom Dale");
    people.yehuda.set('name', "Yehuda Katz");

    ok(people.tom.get('isDirty'), "tom is dirty");
    ok(people.yehuda.get('isDirty'), "yehuda is dirty");

    assertClean(people.tom.save());
    assertClean(people.yehuda.save());
  }));

});

test("An adapter can notify the store that a record was updated and provide new data by calling `didSaveRecord`.", function() {
  env.adapter.updateRecord = function(store, type, record) {
    switch (record.get('id')) {
      case "1":
        return Ember.RSVP.resolve({ id: 1, name: "Tom Dale", updatedAt: "now" });
      case "2":
        return Ember.RSVP.resolve({ id: 2, name: "Yehuda Katz", updatedAt: "now!" });
    }
  };

  env.store.push('person', { id: 1, name: "Braaaahm Dale" });
  env.store.push('person', { id: 2, name: "Gentile Katz" });


  hash({ tom: store.find('person', 1), yehuda: store.find('person', 2) }).then(async(function(people) {
    people.tom.set('name', "Draaaaaahm Dale");
    people.yehuda.set('name', "Goy Katz");

    return hash({ tom: people.tom.save(), yehuda: people.yehuda.save() });
  })).then(async(function(people) {
    equal(people.tom.get('name'), "Tom Dale", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(people.tom.get('updatedAt'), "now", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
    equal(people.yehuda.get('name'), "Yehuda Katz", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(people.yehuda.get('updatedAt'), "now!", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
  }));

});

test("An adapter can notify the store that records were deleted by calling `didSaveRecords`.", function() {
  env.adapter.deleteRecord = function(store, type, record) {
    return Ember.RSVP.resolve();
  };

  env.store.push('person', { id: 1, name: "Braaaahm Dale" });
  env.store.push('person', { id: 2, name: "Gentile Katz" });

  hash({ tom: store.find('person', 1), yehuda: store.find('person', 2) }).then(async(function(people) {
    people.tom.deleteRecord();
    people.yehuda.deleteRecord();

    assertClean(people.tom.save());
    assertClean(people.yehuda.save());
  }));
});

})();

(function() {
var env, store, adapter, Post, Person, Comment, SuperUser;
var originalAjax, passedUrl, passedVerb, passedHash;

module("integration/adapter/rest_adapter - REST Adapter", {
  setup: function() {
    Post = DS.Model.extend({
      name: DS.attr("string")
    });

    Post.toString = function() {
      return "Post";
    };

    Comment = DS.Model.extend({
      name: DS.attr("string")
    });

    SuperUser = DS.Model.extend();

    env = setupStore({
      post: Post,
      comment: Comment,
      superUser: SuperUser,
      adapter: DS.RESTAdapter
    });

    store = env.store;
    adapter = env.adapter;

    passedUrl = passedVerb = passedHash = null;
  }
});

function ajaxResponse(value) {
  adapter.ajax = function(url, verb, hash) {
    passedUrl = url;
    passedVerb = verb;
    passedHash = hash;

    return Ember.RSVP.resolve(value);
  };
}

test("find - basic payload", function() {
  ajaxResponse({ posts: [{ id: 1, name: "Rails is omakase" }] });

  store.find('post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");
  }));
});

test("find - basic payload (with legacy singular name)", function() {
  ajaxResponse({ post: { id: 1, name: "Rails is omakase" } });

  store.find('post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");
  }));
});
test("find - payload with sideloaded records of the same type", function() {
  var count = 0;

  ajaxResponse({
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }
    ]
  });

  store.find('post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");

    var post2 = store.getById('post', 2);
    equal(post2.get('id'), "2");
    equal(post2.get('name'), "The Parley Letter");
  }));
});

test("find - payload with sideloaded records of a different type", function() {
  ajaxResponse({
    posts: [{ id: 1, name: "Rails is omakase" }],
    comments: [{ id: 1, name: "FIRST" }]
  });

  store.find('post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");

    var comment = store.getById('comment', 1);
    equal(comment.get('id'), "1");
    equal(comment.get('name'), "FIRST");
  }));
});

test("find - payload with an serializer-specified primary key", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_ID_'
  }));

  ajaxResponse({ posts: [{ "_ID_": 1, name: "Rails is omakase" }] });

  store.find('post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");
  }));
});

test("find - payload with a serializer-specified attribute mapping", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    attrs: {
      'name': '_NAME_',
      'createdAt': { key: '_CREATED_AT_', someOtherOption: 'option' }
    }
  }));

  Post.reopen({
    createdAt: DS.attr("number")
  });

  ajaxResponse({ posts: [{ id: 1, _NAME_: "Rails is omakase", _CREATED_AT_: 2013 }] });

  store.find('post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");
    equal(post.get('createdAt'), 2013);
  }));
});

test("create - an empty payload is a basic success if an id was specified", function() {
  ajaxResponse();

  var post = store.createRecord('post', { id: "some-uuid", name: "The Parley Letter" });

  post.save().then(async(function(post) {
    equal(passedUrl, "/posts");
    equal(passedVerb, "POST");
    deepEqual(passedHash.data, { post: { id: "some-uuid", name: "The Parley Letter" } });

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "The Parley Letter", "the post was updated");
  }));
});

test("create - a payload with a new ID and data applies the updates", function() {
  ajaxResponse({ posts: [{ id: "1", name: "Dat Parley Letter" }] });
  var post = store.createRecord('post', { name: "The Parley Letter" });

  post.save().then(async(function(post) {
    equal(passedUrl, "/posts");
    equal(passedVerb, "POST");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('id'), "1", "the post has the updated ID");
    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");
  }));
});

test("create - a payload with a new ID and data applies the updates (with legacy singular name)", function() {
  ajaxResponse({ post: { id: "1", name: "Dat Parley Letter" } });
  var post = store.createRecord('post', { name: "The Parley Letter" });

  post.save().then(async(function(post) {
    equal(passedUrl, "/posts");
    equal(passedVerb, "POST");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('id'), "1", "the post has the updated ID");
    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");
  }));
});

test("create - findMany doesn't overwrite owner", function() {
  ajaxResponse({ comment: { id: "1", name: "Dat Parley Letter", post: 1 } });

  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  Comment.reopen({ post: DS.belongsTo('post') });

  store.push('post', { id: 1, name: "Rails is omakase", comments: [] });
  var post = store.getById('post', 1);

  var comment = store.createRecord('comment', { name: "The Parley Letter" });
  post.get('comments').pushObject(comment);

  equal(comment.get('post'), post, "the post has been set correctly");

  comment.save().then(async(function(comment) {
    equal(comment.get('isDirty'), false, "the post isn't dirty anymore");
    equal(comment.get('name'), "Dat Parley Letter", "the post was updated");
    equal(comment.get('post'), post, "the post is still set");
  }));
});

test("create - a serializer's primary key and attributes are consulted when building the payload", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_id_',

    attrs: {
      name: '_name_'
    }
  }));

  ajaxResponse();

  var post = store.createRecord('post', { id: "some-uuid", name: "The Parley Letter" });

  post.save().then(async(function(post) {
    deepEqual(passedHash.data, { post: { _id_: 'some-uuid', '_name_': "The Parley Letter" } });
  }));
});

test("create - a serializer's attributes are consulted when building the payload if no id is pre-defined", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    primarykey: '_id_',

    attrs: {
      name: '_name_'
    }
  }));

  ajaxResponse();

  var post = store.createRecord('post', { name: "The Parley Letter" });

  post.save().then(async(function(post) {
    deepEqual(passedHash.data, { post: { '_name_': "The Parley Letter" } });
  }));
});

test("create - a record on the many side of a hasMany relationship should update relationships when data is sideloaded", function() {
  expect(3);

  ajaxResponse({
    posts: [{
      id: "1",
      name: "Rails is omakase",
      comments: [1,2]
    }],
    comments: [{
      id: "1",
      name: "Dat Parley Letter",
      post: 1
    },{
      id: "2",
      name: "Another Comment",
      post: 1
    }]
    // My API is returning a comment:{} as well as a comments:[{...},...]
    //, comment: {
    //   id: "2",
    //   name: "Another Comment",
    //   post: 1
    // }
  });

  Post.reopen({ comments: DS.hasMany('comment') });
  Comment.reopen({ post: DS.belongsTo('post') });

  store.push('post', { id: 1, name: "Rails is omakase", comments: [1] });
  store.push('comment', { id: 1, name: "Dat Parlay Letter", post: 1 });

  var post = store.getById('post', 1);
  var commentCount = post.get('comments.length');
  equal(commentCount, 1, "the post starts life with a comment");

  var comment = store.createRecord('comment', { name: "Another Comment", post: post });

  comment.save().then(async(function(comment) {
    equal(comment.get('post'), post, "the comment is related to the post");
  }));

  post.reload().then(async(function(post) {
    equal(post.get('comments.length'), 2, "Post comment count has been updated");
  }));
});

test("update - an empty payload is a basic success", function() {
  store.push('post', { id: 1, name: "Rails is omakase" });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse();

    post.set('name', "The Parley Letter");
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "PUT");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "The Parley Letter", "the post was updated");
  }));
});

test("update - a payload with updates applies the updates", function() {
  store.push('post', { id: 1, name: "Rails is omakase" });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({ posts: [{ id: 1, name: "Dat Parley Letter" }] });

    post.set('name', "The Parley Letter");
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "PUT");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");
  }));
});

test("update - a payload with updates applies the updates (with legacy singular name)", function() {
  store.push('post', { id: 1, name: "Rails is omakase" });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({ post: { id: 1, name: "Dat Parley Letter" } });

    post.set('name', "The Parley Letter");
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "PUT");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");
  }));
});

test("update - a payload with sideloaded updates pushes the updates", function() {
  ajaxResponse({
    posts: [{ id: 1, name: "Dat Parley Letter" }],
    comments: [{ id: 1, name: "FIRST" }]
  });
  var post = store.createRecord('post', { name: "The Parley Letter" });

  post.save().then(async(function(post) {
    equal(passedUrl, "/posts");
    equal(passedVerb, "POST");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('id'), "1", "the post has the updated ID");
    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");

    var comment = store.getById('comment', 1);
    equal(comment.get('name'), "FIRST", "The comment was sideloaded");
  }));
});


test("update - a payload with sideloaded updates pushes the updates", function() {
  store.push('post', { id: 1, name: "Rails is omakase" });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({
      posts: [{ id: 1, name: "Dat Parley Letter" }],
      comments: [{ id: 1, name: "FIRST" }]
    });

    post.set('name', "The Parley Letter");
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "PUT");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");

    var comment = store.getById('comment', 1);
    equal(comment.get('name'), "FIRST", "The comment was sideloaded");
  }));
});

test("update - a serializer's primary key and attributes are consulted when building the payload", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_id_',

    attrs: {
      name: '_name_'
    }
  }));

  store.push('post', { id: 1, name: "Rails is omakase" });
  ajaxResponse();

  store.find('post', 1).then(async(function(post) {
    post.set('name', "The Parley Letter");
    return post.save();
  })).then(async(function(post) {
    deepEqual(passedHash.data, { post: { '_name_': "The Parley Letter" } });
  }));
});

test("delete - an empty payload is a basic success", function() {
  store.push('post', { id: 1, name: "Rails is omakase" });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse();

    post.deleteRecord();
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "DELETE");
    equal(passedHash, undefined);

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('isDeleted'), true, "the post is now deleted");
  }));
});

test("delete - a payload with sideloaded updates pushes the updates", function() {
  store.push('post', { id: 1, name: "Rails is omakase" });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({ comments: [{ id: 1, name: "FIRST" }] });

    post.deleteRecord();
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "DELETE");
    equal(passedHash, undefined);

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('isDeleted'), true, "the post is now deleted");

    var comment = store.getById('comment', 1);
    equal(comment.get('name'), "FIRST", "The comment was sideloaded");
  }));
});

test("findAll - returning an array populates the array", function() {
  ajaxResponse({
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }
    ]
  });

  store.findAll('post').then(async(function(posts) {
    equal(passedUrl, "/posts");
    equal(passedVerb, "GET");
    equal(passedHash.data, undefined);

    var post1 = store.getById('post', 1),
        post2 = store.getById('post', 2);

    deepEqual(
      post1.getProperties('id', 'name'),
      { id: "1", name: "Rails is omakase" },
      "Post 1 is loaded"
    );

    deepEqual(
      post2.getProperties('id', 'name'),
      { id: "2", name: "The Parley Letter" },
      "Post 2 is loaded"
    );

    equal(posts.get('length'), 2, "The posts are in the array");
    equal(posts.get('isLoaded'), true, "The RecordArray is loaded");
    deepEqual(
      posts.toArray(),
      [ post1, post2 ],
      "The correct records are in the array"
    );
  }));
});

test("findAll - returning sideloaded data loads the data", function() {
  ajaxResponse({
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }
    ],
    comments: [{ id: 1, name: "FIRST" }] });

  store.findAll('post').then(async(function(posts) {
    var comment = store.getById('comment', 1);

    deepEqual(comment.getProperties('id', 'name'), { id: "1", name: "FIRST" });
  }));
});

test("findAll - data is normalized through custom serializers", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  ajaxResponse({
    posts: [
      { _ID_: 1, _NAME_: "Rails is omakase" },
      { _ID_: 2, _NAME_: "The Parley Letter" }
    ]
  });

  store.findAll('post').then(async(function(posts) {
    var post1 = store.getById('post', 1),
        post2 = store.getById('post', 2);

    deepEqual(
      post1.getProperties('id', 'name'),
      { id: "1", name: "Rails is omakase" },
      "Post 1 is loaded"
    );
    deepEqual(
      post2.getProperties('id', 'name'),
      { id: "2", name: "The Parley Letter" },
      "Post 2 is loaded"
    );

    equal(posts.get('length'), 2, "The posts are in the array");
    equal(posts.get('isLoaded'), true, "The RecordArray is loaded");
    deepEqual(
      posts.toArray(),
      [ post1, post2 ],
      "The correct records are in the array"
    );
  }));
});

test("findAll - since token is passed to the adapter", function() {
  ajaxResponse({
    meta: { since: 'later'},
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }
    ]
  });

  store.metaForType('post', { since: 'now' });

  store.findAll('post').then(async(function(posts) {
    equal(passedUrl, '/posts');
    equal(passedVerb, 'GET');
    equal(store.typeMapFor(Post).metadata.since, 'later');
    deepEqual(passedHash.data, { since: 'now' });
  }));
});

test("metadata is accessible", function() {
  ajaxResponse({
    meta: { offset: 5 },
    posts: [{id: 1, name: "Rails is very expensive sushi"}]
  });

  store.findAll('post').then(async(function(posts) {
    equal(
      store.metadataFor('post').offset,
      5,
      "Metadata can be accessed with metadataFor."
    );
  }));
});

test("findQuery - payload 'meta' is accessible on the record array", function() {
  ajaxResponse({
    meta: { offset: 5 },
    posts: [{id: 1, name: "Rails is very expensive sushi"}]
  });

  store.findQuery('post', { page: 2 }).then(async(function(posts) {
    equal(
      posts.get('meta.offset'),
      5,
      "Reponse metadata can be accessed with recordArray.meta"
    );
  }));
});

test("findQuery - returning an array populates the array", function() {
  ajaxResponse({
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }]
  });

  store.findQuery('post', { page: 1 }).then(async(function(posts) {
    equal(passedUrl, '/posts');
    equal(passedVerb, 'GET');
    deepEqual(passedHash.data, { page: 1 });

    var post1 = store.getById('post', 1),
        post2 = store.getById('post', 2);

    deepEqual(
      post1.getProperties('id', 'name'),
      { id: "1", name: "Rails is omakase" },
      "Post 1 is loaded"
    );
    deepEqual(
      post2.getProperties('id', 'name'),
      { id: "2", name: "The Parley Letter" },
      "Post 2 is loaded"
    );

    equal(posts.get('length'), 2, "The posts are in the array");
    equal(posts.get('isLoaded'), true, "The RecordArray is loaded");
    deepEqual(
      posts.toArray(),
      [ post1, post2 ],
      "The correct records are in the array"
    );
  }));
});

test("findQuery - returning sideloaded data loads the data", function() {
  ajaxResponse({
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }
    ],
    comments: [{ id: 1, name: "FIRST" }]
  });

  store.findQuery('post', { page: 1 }).then(async(function(posts) {
    var comment = store.getById('comment', 1);

    deepEqual(comment.getProperties('id', 'name'), { id: "1", name: "FIRST" });
  }));
});

test("findQuery - data is normalized through custom serializers", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  ajaxResponse({
    posts: [{ _ID_: 1, _NAME_: "Rails is omakase" },
            { _ID_: 2, _NAME_: "The Parley Letter" }]
  });

  store.findQuery('post', { page: 1 }).then(async(function(posts) {
    var post1 = store.getById('post', 1),
        post2 = store.getById('post', 2);

    deepEqual(
      post1.getProperties('id', 'name'),
      { id: "1", name: "Rails is omakase" },
      "Post 1 is loaded"
    );

    deepEqual(
      post2.getProperties('id', 'name'),
      { id: "2", name: "The Parley Letter" },
      "Post 2 is loaded"
    );

    equal(posts.get('length'), 2, "The posts are in the array");
    equal(posts.get('isLoaded'), true, "The RecordArray is loaded");
    deepEqual(
      posts.toArray(),
      [ post1, post2 ],
      "The correct records are in the array"
    );
  }));
});

test("findMany - returning an array populates the array", function() {
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  store.push('post', { id: 1, name: "Rails is omakase", comments: [ 1, 2, 3 ] });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({
      comments: [
        { id: 1, name: "FIRST" },
        { id: 2, name: "Rails is unagi" },
        { id: 3, name: "What is omakase?" }
      ]
    });

return post.get('comments');
  })).then(async(function(comments) {
    var comment1 = store.getById('comment', 1),
        comment2 = store.getById('comment', 2),
        comment3 = store.getById('comment', 3);

    deepEqual(comment1.getProperties('id', 'name'), { id: "1", name: "FIRST" });
    deepEqual(comment2.getProperties('id', 'name'), { id: "2", name: "Rails is unagi" });
    deepEqual(comment3.getProperties('id', 'name'), { id: "3", name: "What is omakase?" });

    deepEqual(
      comments.toArray(),
      [ comment1, comment2, comment3 ],
      "The correct records are in the array"
    );
  }));
});

test("findMany - returning sideloaded data loads the data", function() {
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  store.push('post', { id: 1, name: "Rails is omakase", comments: [ 1, 2, 3 ] });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({
      comments: [
        { id: 1, name: "FIRST" },
        { id: 2, name: "Rails is unagi" },
        { id: 3, name: "What is omakase?" },
        { id: 4, name: "Unrelated comment" }
      ],
      posts: [{ id: 2, name: "The Parley Letter" }]
    });

    return post.get('comments');
  })).then(async(function(comments) {
    var comment1 = store.getById('comment', 1),
        comment2 = store.getById('comment', 2),
        comment3 = store.getById('comment', 3),
        comment4 = store.getById('comment', 4),
        post2    = store.getById('post', 2);

    deepEqual(
      comments.toArray(),
      [ comment1, comment2, comment3 ],
      "The correct records are in the array"
    );

    deepEqual(comment4.getProperties('id', 'name'), { id: "4", name: "Unrelated comment" });
    deepEqual(post2.getProperties('id', 'name'), { id: "2", name: "The Parley Letter" });
  }));
});

test("findMany - a custom serializer is used if present", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  env.container.register('serializer:comment', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  store.push('post', { id: 1, name: "Rails is omakase", comments: [ 1, 2, 3 ] });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({
      comments: [
        { _ID_: 1, _NAME_: "FIRST" },
        { _ID_: 2, _NAME_: "Rails is unagi" },
        { _ID_: 3, _NAME_: "What is omakase?" }]
    });

    return post.get('comments');
  })).then(async(function(comments) {
    var comment1 = store.getById('comment', 1),
        comment2 = store.getById('comment', 2),
        comment3 = store.getById('comment', 3);

    deepEqual(comment1.getProperties('id', 'name'), { id: "1", name: "FIRST" });
    deepEqual(comment2.getProperties('id', 'name'), { id: "2", name: "Rails is unagi" });
    deepEqual(comment3.getProperties('id', 'name'), { id: "3", name: "What is omakase?" });

    deepEqual(comments.toArray(), [ comment1, comment2, comment3 ], "The correct records are in the array");
  }));
});

test("findHasMany - returning an array populates the array", function() {
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  store.push(
    'post',
    {
      id: 1,
      name: "Rails is omakase",
      links: { comments: '/posts/1/comments' }
    }
  );

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({
      comments: [
        { id: 1, name: "FIRST" },
        { id: 2, name: "Rails is unagi" },
        { id: 3, name: "What is omakase?" }
      ]
    });

    return post.get('comments');
  })).then(async(function(comments) {
    equal(passedUrl, '/posts/1/comments');
    equal(passedVerb, 'GET');
    equal(passedHash, undefined);

    var comment1 = store.getById('comment', 1),
        comment2 = store.getById('comment', 2),
        comment3 = store.getById('comment', 3);

    deepEqual(comment1.getProperties('id', 'name'), { id: "1", name: "FIRST" });
    deepEqual(comment2.getProperties('id', 'name'), { id: "2", name: "Rails is unagi" });
    deepEqual(comment3.getProperties('id', 'name'), { id: "3", name: "What is omakase?" });

    deepEqual(comments.toArray(), [ comment1, comment2, comment3 ], "The correct records are in the array");
  }));
});

test("findMany - returning sideloaded data loads the data", function() {
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  store.push(
    'post',
    {
      id: 1,
      name: "Rails is omakase",
      links: { comments: '/posts/1/comments' }
    }
  );

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({
      comments: [
        { id: 1, name: "FIRST" },
        { id: 2, name: "Rails is unagi" },
        { id: 3, name: "What is omakase?" }
      ],
      posts: [{ id: 2, name: "The Parley Letter" }]
    });

    return post.get('comments');
  })).then(async(function(comments) {
    var comment1 = store.getById('comment', 1),
        comment2 = store.getById('comment', 2),
        comment3 = store.getById('comment', 3),
        post2    = store.getById('post', 2);

    deepEqual(comments.toArray(), [ comment1, comment2, comment3 ], "The correct records are in the array");

    deepEqual(post2.getProperties('id', 'name'), { id: "2", name: "The Parley Letter" });
  }));
});

test("findMany - a custom serializer is used if present", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  env.container.register('serializer:comment', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  store.push(
    'post',
    {
      id: 1,
      name: "Rails is omakase",
      links: { comments: '/posts/1/comments' }
    }
  );

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({
      comments: [
        { _ID_: 1, _NAME_: "FIRST" },
        { _ID_: 2, _NAME_: "Rails is unagi" },
        { _ID_: 3, _NAME_: "What is omakase?" }
      ]
    });
    return post.get('comments');
  })).then(async(function(comments) {
    var comment1 = store.getById('comment', 1),
        comment2 = store.getById('comment', 2),
        comment3 = store.getById('comment', 3);

    deepEqual(comment1.getProperties('id', 'name'), { id: "1", name: "FIRST" });
    deepEqual(comment2.getProperties('id', 'name'), { id: "2", name: "Rails is unagi" });
    deepEqual(comment3.getProperties('id', 'name'), { id: "3", name: "What is omakase?" });

    deepEqual(comments.toArray(), [ comment1, comment2, comment3 ], "The correct records are in the array");
  }));
});

test('buildURL - with host and namespace', function() {
  adapter.setProperties({
    host: 'http://example.com',
    namespace: 'api/v1'
  });

  ajaxResponse({ posts: [{ id: 1 }] });

  store.find('post', 1).then(async(function(post) {
    equal(passedUrl, "http://example.com/api/v1/posts/1");
  }));
});

test('buildURL - with relative paths in links', function() {
  adapter.setProperties({
    host: 'http://example.com',
    namespace: 'api/v1'
  });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  Comment.reopen({ post: DS.belongsTo('post') });

  ajaxResponse({ posts: [{ id: 1, links: { comments: 'comments' } }] });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({ comments: [{ id: 1 }] });
    return post.get('comments');
  })).then(async(function (comments) {
    equal(passedUrl, "http://example.com/api/v1/posts/1/comments");
  }));
});

test('buildURL - with absolute paths in links', function() {
  adapter.setProperties({
    host: 'http://example.com',
    namespace: 'api/v1'
  });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  Comment.reopen({ post: DS.belongsTo('post') });

  ajaxResponse({ posts: [{ id: 1, links: { comments: '/api/v1/posts/1/comments' } }] });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({ comments: [{ id: 1 }] });
    return post.get('comments');
  })).then(async(function (comments) {
    equal(passedUrl, "http://example.com/api/v1/posts/1/comments");
  }));
});

test('buildURL - with full URLs in links', function() {
  adapter.setProperties({
    host: 'http://example.com',
    namespace: 'api/v1'
  });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  Comment.reopen({ post: DS.belongsTo('post') });

  ajaxResponse({
    posts: [
      { id: 1,
        links: { comments: 'http://example.com/api/v1/posts/1/comments' }
      }
    ]
  });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({ comments: [{ id: 1 }] });
    return post.get('comments');
  })).then(async(function (comments) {
    equal(passedUrl, "http://example.com/api/v1/posts/1/comments");
  }));
});

test('buildURL - with camelized names', function() {
  adapter.setProperties({
    pathForType: function(type) {
      var decamelized = Ember.String.decamelize(type);
      return Ember.String.pluralize(decamelized);
    }
  });

  ajaxResponse({ superUsers: [{ id: 1 }] });

  store.find('superUser', 1).then(async(function(post) {
    equal(passedUrl, "/super_users/1");
  }));
});

test('normalizeKey - to set up _ids and _id', function() {
  env.container.register('serializer:application', DS.RESTSerializer.extend({
    keyForAttribute: function(attr) {
      //if (kind === 'hasMany') {
        //key = key.replace(/_ids$/, '');
        //key = Ember.String.pluralize(key);
      //} else if (kind === 'belongsTo') {
        //key = key.replace(/_id$/, '');
      //}

      return Ember.String.underscore(attr);
    },

    keyForBelongsTo: function(belongsTo) {
    },

    keyForRelationship: function(rel, kind) {
      if (kind === 'belongsTo') {
        var underscored = Ember.String.underscore(rel);
        return underscored + '_id';
      } else {
        var singular = Ember.String.singularize(rel);
        return Ember.String.underscore(singular) + '_ids';
      }
    }
  }));

  env.container.register('model:post', DS.Model.extend({
    name: DS.attr(),
    authorName: DS.attr(),
    author: DS.belongsTo('user'),
    comments: DS.hasMany('comment')
  }));

  env.container.register('model:user', DS.Model.extend({
    createdAt: DS.attr(),
    name: DS.attr()
  }));

  env.container.register('model:comment', DS.Model.extend({
    body: DS.attr()
  }));

  ajaxResponse({
    posts: [{
      id: "1",
      name: "Rails is omakase",
      author_name: "@d2h",
      author_id: "1",
      comment_ids: [ "1", "2" ]
    }],

    users: [{
      id: "1",
      name: "D2H"
    }],

    comments: [{
      id: "1",
      body: "Rails is unagi"
    }, {
      id: "2",
      body: "What is omakase?"
    }]
  });

  store.find('post', 1).then(async(function(post) {
    equal(post.get('authorName'), "@d2h");
    equal(post.get('author.name'), "D2H");
    deepEqual(post.get('comments').mapBy('body'), ["Rails is unagi", "What is omakase?"]);
  }));
});

//test("creating a record with a 422 error marks the records as invalid", function(){
  //expect(1);

  //var mockXHR = {
    //status:       422,
    //responseText: JSON.stringify({ errors: { name: ["can't be blank"]} })
  //};

  //jQuery.ajax = function(hash) {
    //hash.error.call(hash.context, mockXHR, "Unprocessable Entity");
  //};

  //var post = store.createRecord(Post, { name: "" });

  //post.on("becameInvalid", function() {
    //ok(true, "becameInvalid is called");
  //});

  //post.on("becameError", function() {
    //ok(false, "becameError is not called");
  //});

  //post.save();
//});

//test("changing A=>null=>A should clean up the record", function() {
  //var store = DS.Store.create({
    //adapter: DS.RESTAdapter
  //});
  //var Kidney = DS.Model.extend();
  //var Person = DS.Model.extend();

  //Kidney.reopen({
    //person: DS.belongsTo(Person)
  //});
  //Kidney.toString = function() { return "Kidney"; };

  //Person.reopen({
    //name: DS.attr('string'),
    //kidneys: DS.hasMany(Kidney)
  //});
  //Person.toString = function() { return "Person"; };

  //store.load(Person, { id: 1, kidneys: [1, 2] });
  //store.load(Kidney, { id: 1, person: 1 });
  //store.load(Kidney, { id: 2, person: 1 });

  //var person = store.find(Person, 1);
  //var kidney1 = store.find(Kidney, 1);
  //var kidney2 = store.find(Kidney, 2);

  //deepEqual(person.get('kidneys').toArray(), [kidney1, kidney2], "precond - person should have both kidneys");
  //equal(kidney1.get('person'), person, "precond - first kidney should be in the person");

  //person.get('kidneys').removeObject(kidney1);

  //ok(person.get('isDirty'), "precond - person should be dirty after operation");
  //ok(kidney1.get('isDirty'), "precond - first kidney should be dirty after operation");

  //deepEqual(person.get('kidneys').toArray(), [kidney2], "precond - person should have only the second kidney");
  //equal(kidney1.get('person'), null, "precond - first kidney should be on the operating table");

  //person.get('kidneys').addObject(kidney1);

  //ok(!person.get('isDirty'), "person should be clean after restoration");
  //ok(!kidney1.get('isDirty'), "first kidney should be clean after restoration");

  //deepEqual(person.get('kidneys').toArray(), [kidney2, kidney1], "person should have both kidneys again");
  //equal(kidney1.get('person'), person, "first kidney should be in the person again");
//});

//test("changing A=>B=>A should clean up the record", function() {
  //var store = DS.Store.create({
    //adapter: DS.RESTAdapter
  //});
  //var Kidney = DS.Model.extend();
  //var Person = DS.Model.extend();

  //Kidney.reopen({
    //person: DS.belongsTo(Person)
  //});
  //Kidney.toString = function() { return "Kidney"; };

  //Person.reopen({
    //name: DS.attr('string'),
    //kidneys: DS.hasMany(Kidney)
  //});
  //Person.toString = function() { return "Person"; };

  //store.load(Person, { person: { id: 1, name: "John Doe", kidneys: [1, 2] }});
  //store.load(Person, { person: { id: 2, name: "Jane Doe", kidneys: [3]} });
  //store.load(Kidney, { kidney: { id: 1, person_id: 1 } });
  //store.load(Kidney, { kidney: { id: 2, person_id: 1 } });
  //store.load(Kidney, { kidney: { id: 3, person_id: 2 } });

  //var john = store.find(Person, 1);
  //var jane = store.find(Person, 2);
  //var kidney1 = store.find(Kidney, 1);
  //var kidney2 = store.find(Kidney, 2);
  //var kidney3 = store.find(Kidney, 3);

  //deepEqual(john.get('kidneys').toArray(), [kidney1, kidney2], "precond - john should have the first two kidneys");
  //deepEqual(jane.get('kidneys').toArray(), [kidney3], "precond - jane should have the third kidney");
  //equal(kidney2.get('person'), john, "precond - second kidney should be in john");

  //kidney2.set('person', jane);

  //ok(john.get('isDirty'), "precond - john should be dirty after operation");
  //ok(jane.get('isDirty'), "precond - jane should be dirty after operation");
  //ok(kidney2.get('isDirty'), "precond - second kidney should be dirty after operation");

  //deepEqual(john.get('kidneys').toArray(), [kidney1], "precond - john should have only the first kidney");
  //deepEqual(jane.get('kidneys').toArray(), [kidney3, kidney2], "precond - jane should have the other two kidneys");
  //equal(kidney2.get('person'), jane, "precond - second kidney should be in jane");

  //kidney2.set('person', john);

  //ok(!john.get('isDirty'), "john should be clean after restoration");
  //ok(!jane.get('isDirty'), "jane should be clean after restoration");
  //ok(!kidney2.get('isDirty'), "second kidney should be clean after restoration");

  //deepEqual(john.get('kidneys').toArray(), [kidney1, kidney2], "john should have the first two kidneys again");
  //deepEqual(jane.get('kidneys').toArray(), [kidney3], "jane should have the third kidney again");
  //equal(kidney2.get('person'), john, "second kidney should be in john again");
//});

})();

(function() {
/**
 This is an integration test that tests the communication between a store
 and its adapter.

 Typically, when a method is invoked on the store, it calls a related
 method on its adapter. The adapter notifies the store that it has
 completed the assigned task, either synchronously or asynchronously,
 by calling a method on the store.

 These tests ensure that the proper methods get called, and, if applicable,
 the given record orrecord arrayay changes state appropriately.
*/

var get = Ember.get, set = Ember.set;
var Person, Dog, env, store, adapter;

module("integration/adapter/store_adapter - DS.Store and DS.Adapter integration test", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });

    Dog = DS.Model.extend({
      name: DS.attr('string')
    });

    env = setupStore({ person: Person, dog: Dog });
    store = env.store;
    adapter = env.adapter;
  },

  teardown: function() {
    env.container.destroy();
  }
});

test("Records loaded multiple times and retrieved in recordArray are ready to send state events", function() {
  adapter.findQuery = function(store, type, query, recordArray) {
    return Ember.RSVP.resolve([{
      id: 1,
      name: "Mickael Ramírez"
    }, {
      id: 2,
      name: "Johny Fontana"
    }]);
  };

  store.findQuery('person', {q: 'bla'}).then(async(function(people) {
    var people2 = store.findQuery('person', { q: 'bla2' });

    return Ember.RSVP.hash({ people: people, people2: people2 });
  })).then(async(function(results) {
    equal(results.people2.get('length'), 2, 'return the elements' );
    ok( results.people2.get('isLoaded'), 'array is loaded' );

    var person = results.people.objectAt(0);
    ok(person.get('isLoaded'), 'record is loaded');

    // delete record will not throw exception
    person.deleteRecord();
  }));

});

test("by default, createRecords calls createRecord once per record", function() {
  var count = 1;

  adapter.createRecord = function(store, type, record) {
    equal(type, Person, "the type is correct");

    if (count === 1) {
      equal(get(record, 'name'), "Tom Dale");
    } else if (count === 2) {
      equal(get(record, 'name'), "Yehuda Katz");
    } else {
      ok(false, "should not have invoked more than 2 times");
    }

    var hash = get(record, 'data');
    hash.id = count;
    hash.updatedAt = "now";

    count++;
    return Ember.RSVP.resolve(hash);
  };

  var tom = store.createRecord('person', { name: "Tom Dale" });
  var yehuda = store.createRecord('person', { name: "Yehuda Katz" });

  Ember.RSVP.hash({ tom: tom.save(), yehuda: yehuda.save() }).then(async(function(records) {
    tom = records.tom;
    yehuda = records.yehuda;

    asyncEqual(tom, store.find('person', 1), "Once an ID is in, find returns the same object");
    asyncEqual(yehuda, store.find('person', 2), "Once an ID is in, find returns the same object");
    equal(get(tom, 'updatedAt'), "now", "The new information is received");
    equal(get(yehuda, 'updatedAt'), "now", "The new information is received");
  }));
});

test("by default, updateRecords calls updateRecord once per record", function() {
  var count = 0;

  adapter.updateRecord = function(store, type, record) {
    equal(type, Person, "the type is correct");

    if (count === 0) {
      equal(get(record, 'name'), "Tom Dale");
    } else if (count === 1) {
      equal(get(record, 'name'), "Yehuda Katz");
    } else {
      ok(false, "should not get here");
    }

    count++;

    equal(record.get('isSaving'), true, "record is saving");

    return Ember.RSVP.resolve();
  };

  store.push('person', { id: 1, name: "Braaaahm Dale" });
  store.push('person', { id: 2, name: "Brohuda Katz" });

  Ember.RSVP.hash({ tom: store.find('person', 1), yehuda: store.find('person', 2) }).then(async(function(records) {
    var tom = records.tom, yehuda = records.yehuda;

    set(tom, "name", "Tom Dale");
    set(yehuda, "name", "Yehuda Katz");

    return Ember.RSVP.hash({ tom: tom.save(), yehuda: yehuda.save() });
  })).then(async(function(records) {
    var tom = records.tom, yehuda = records.yehuda;

    equal(tom.get('isSaving'), false, "record is no longer saving");
    equal(tom.get('isLoaded'), true, "record is loaded");

    equal(yehuda.get('isSaving'), false, "record is no longer saving");
    equal(yehuda.get('isLoaded'), true, "record is loaded");
  }));
});

test("calling store.didSaveRecord can provide an optional hash", function() {
  var count = 0;

  adapter.updateRecord = function(store, type, record) {
    equal(type, Person, "the type is correct");

    count++;
    if (count === 1) {
      equal(get(record, 'name'), "Tom Dale");
      return Ember.RSVP.resolve({ id: 1, name: "Tom Dale", updatedAt: "now" });
    } else if (count === 2) {
      equal(get(record, 'name'), "Yehuda Katz");
      return Ember.RSVP.resolve({ id: 2, name: "Yehuda Katz", updatedAt: "now!" });
    } else {
      ok(false, "should not get here");
    }
  };

  store.push('person', { id: 1, name: "Braaaahm Dale" });
  store.push('person', { id: 2, name: "Brohuda Katz" });

  Ember.RSVP.hash({ tom: store.find('person', 1), yehuda: store.find('person', 2) }).then(async(function(records) {
    var tom = records.tom, yehuda = records.yehuda;

    set(tom, "name", "Tom Dale");
    set(yehuda, "name", "Yehuda Katz");

    return Ember.RSVP.hash({ tom: tom.save(), yehuda: yehuda.save() });
  })).then(async(function(records) {
    var tom = records.tom, yehuda = records.yehuda;

    equal(get(tom, 'isDirty'), false, "the record should not be dirty");
    equal(get(tom, 'updatedAt'), "now", "the hash was updated");

    equal(get(yehuda, 'isDirty'), false, "the record should not be dirty");
    equal(get(yehuda, 'updatedAt'), "now!", "the hash was updated");
  }));
});

test("by default, deleteRecord calls deleteRecord once per record", function() {
  expect(4);

  var count = 0;

  adapter.deleteRecord = function(store, type, record) {
    equal(type, Person, "the type is correct");

    if (count === 0) {
      equal(get(record, 'name'), "Tom Dale");
    } else if (count === 1) {
      equal(get(record, 'name'), "Yehuda Katz");
    } else {
      ok(false, "should not get here");
    }

    count++;

    return Ember.RSVP.resolve();
  };

  store.push('person', { id: 1, name: "Tom Dale" });
  store.push('person', { id: 2, name: "Yehuda Katz" });

  Ember.RSVP.hash({ tom: store.find('person', 1), yehuda: store.find('person', 2) }).then(async(function(records) {
    var tom = records.tom, yehuda = records.yehuda;

    tom.deleteRecord();
    yehuda.deleteRecord();

    tom.save();
    yehuda.save();
  }));
});

test("by default, destroyRecord calls deleteRecord once per record without requiring .save", function() {
  expect(4);

  var count = 0;

  adapter.deleteRecord = function(store, type, record) {
    equal(type, Person, "the type is correct");

    if (count === 0) {
      equal(get(record, 'name'), "Tom Dale");
    } else if (count === 1) {
      equal(get(record, 'name'), "Yehuda Katz");
    } else {
      ok(false, "should not get here");
    }

    count++;

    return Ember.RSVP.resolve();
  };

  store.push('person', { id: 1, name: "Tom Dale" });
  store.push('person', { id: 2, name: "Yehuda Katz" });

  Ember.RSVP.hash({ tom: store.find('person', 1), yehuda: store.find('person', 2) }).then(async(function(records) {
    var tom = records.tom, yehuda = records.yehuda;

    tom.destroyRecord();
    yehuda.destroyRecord();
  }));
});

test("if an existing model is edited then deleted, deleteRecord is called on the adapter", function() {
  expect(5);

  var count = 0;

  adapter.deleteRecord = function(store, type, record) {
    count++;
    equal(get(record, 'id'), 'deleted-record', "should pass correct record to deleteRecord");
    equal(count, 1, "should only call deleteRecord method of adapter once");

    return Ember.RSVP.resolve();
  };

  adapter.updateRecord = function() {
    ok(false, "should not have called updateRecord method of adapter");
  };

  // Load data for a record into the store.
  store.push('person', { id: 'deleted-record', name: "Tom Dale" });

  // Retrieve that loaded record and edit it so it becomes dirty
  store.find('person', 'deleted-record').then(async(function(tom) {
    tom.set('name', "Tom Mothereffin' Dale");

    equal(get(tom, 'isDirty'), true, "precond - record should be dirty after editing");

    tom.deleteRecord();
    return tom.save();
  })).then(async(function(tom) {
    equal(get(tom, 'isDirty'), false, "record should not be dirty");
    equal(get(tom, 'isDeleted'), true, "record should be considered deleted");
  }));
});

test("if a deleted record errors, it enters the error state", function() {
  var count = 0;

  adapter.deleteRecord = function(store, type, record) {
    if (count++ === 0) {
      return Ember.RSVP.reject();
    } else {
      return Ember.RSVP.resolve();
    }
  };

  store.push('person', { id: 'deleted-record', name: "Tom Dale" });

  var tom;

  store.find('person', 'deleted-record').then(async(function(person) {
    tom = person;
    person.deleteRecord();
    return person.save();
  })).then(null, async(function() {
    equal(tom.get('isError'), true, "Tom is now errored");

    // this time it succeeds
    return tom.save();
  })).then(async(function() {
    equal(tom.get('isError'), false, "Tom is not errored anymore");
  }));
});

test("if a created record is marked as invalid by the server, it enters an error state", function() {
  adapter.createRecord = function(store, type, record) {
    equal(type, Person, "the type is correct");

    if (get(record, 'name').indexOf('Bro') === -1) {
      return Ember.RSVP.reject(new DS.InvalidError({ name: ['common... name requires a "bro"'] }));
    } else {
      return Ember.RSVP.resolve();
    }
  };

  var yehuda = store.createRecord('person', { id: 1, name: "Yehuda Katz" });

  // Wrap this in an Ember.run so that all chained async behavior is set up
  // before flushing any scheduled behavior.
  Ember.run(function() {
    yehuda.save().then(null, async(function(error) {
      equal(get(yehuda, 'isValid'), false, "the record is invalid");
      ok(get(yehuda, 'errors.name'), "The errors.name property exists");

      set(yehuda, 'updatedAt', true);
      equal(get(yehuda, 'isValid'), false, "the record is still invalid");

      // This tests that we handle undefined values without blowing up
      var errors = get(yehuda, 'errors');
      set(errors, 'other_bound_property', undefined);
      set(yehuda, 'errors', errors);
      set(yehuda, 'name', "Brohuda Brokatz");

      equal(get(yehuda, 'isValid'), true, "the record is no longer invalid after changing");
      equal(get(yehuda, 'isDirty'), true, "the record has outstanding changes");

      equal(get(yehuda, 'isNew'), true, "precond - record is still new");

      return yehuda.save();
    })).then(async(function(person) {
      strictEqual(person, yehuda, "The promise resolves with the saved record");

      equal(get(yehuda, 'isValid'), true, "record remains valid after committing");
      equal(get(yehuda, 'isNew'), false, "record is no longer new");
    }));
  });
});

test("if a created record is marked as erred by the server, it enters an error state", function() {
  adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.reject();
  };

  Ember.run(function() {
    var person = store.createRecord('person', { id: 1, name: "John Doe" });

    person.save().then(null, async(function() {
      ok(get(person, 'isError'), "the record is in the error state");
    }));
  });
});

test("if an updated record is marked as invalid by the server, it enters an error state", function() {
  adapter.updateRecord = function(store, type, record) {
    equal(type, Person, "the type is correct");

    if (get(record, 'name').indexOf('Bro') === -1) {
      return Ember.RSVP.reject(new DS.InvalidError({ name: ['common... name requires a "bro"'] }));
    } else {
      return Ember.RSVP.resolve();
    }
  };

  var yehuda = store.push('person', { id: 1, name: "Brohuda Brokatz" });

  Ember.run(function() {
    store.find('person', 1).then(async(function(person) {
      equal(person, yehuda, "The same object is passed through");

      equal(get(yehuda, 'isValid'), true, "precond - the record is valid");
      set(yehuda, 'name', "Yehuda Katz");
      equal(get(yehuda, 'isValid'), true, "precond - the record is still valid as far as we know");

      equal(get(yehuda, 'isDirty'), true, "the record is dirty");

      return yehuda.save();
    })).then(null, async(function(reason) {
      equal(get(yehuda, 'isDirty'), true, "the record is still dirty");
      equal(get(yehuda, 'isValid'), false, "the record is invalid");

      set(yehuda, 'updatedAt', true);
      equal(get(yehuda, 'isValid'), false, "the record is still invalid");

      set(yehuda, 'name', "Brohuda Brokatz");
      equal(get(yehuda, 'isValid'), true, "the record is no longer invalid after changing");
      equal(get(yehuda, 'isDirty'), true, "the record has outstanding changes");

      return yehuda.save();
    })).then(async(function(yehuda) {
      equal(get(yehuda, 'isValid'), true, "record remains valid after committing");
      equal(get(yehuda, 'isDirty'), false, "record is no longer new");
    }));
  });
});

test("if a updated record is marked as erred by the server, it enters an error state", function() {
  adapter.updateRecord = function(store, type, record) {
    return Ember.RSVP.reject();
  };

  var person = store.push(Person, { id: 1, name: "John Doe" });

  store.find('person', 1).then(async(function(record) {
    equal(record, person, "The person was resolved");
    person.set('name', "Jonathan Doe");
    return person.save();
  })).then(null, async(function(reason) {
    ok(get(person, 'isError'), "the record is in the error state");
  }));
});

test("can be created after the DS.Store", function() {
  expect(1);

  adapter.find = function(store, type) {
    equal(type, Person, "the type is correct");
    return Ember.RSVP.resolve({ id: 1 });
  };

  store.find('person', 1);
});

test("the filter method can optionally take a server query as well", function() {
  adapter.findQuery = function(store, type, query, array) {
    return Ember.RSVP.resolve([
      { id: 1, name: "Yehuda Katz" },
      { id: 2, name: "Tom Dale" }
    ]);
  };

  var asyncFilter = store.filter('person', { page: 1 }, function(data) {
    return data.get('name') === "Tom Dale";
  });

  var loadedFilter;

  asyncFilter.then(async(function(filter) {
    loadedFilter = filter;
    return store.find('person', 2);
  })).then(async(function(tom) {
    equal(get(loadedFilter, 'length'), 1, "The filter has an item in it");
    deepEqual(loadedFilter.toArray(), [ tom ], "The filter has a single entry in it");
  }));
});

test("relationships returned via `commit` do not trigger additional findManys", function() {
  Person.reopen({
    dogs: DS.hasMany()
  });

  store.push('dog', { id: 1, name: "Scruffy" });

  adapter.find = function(store, type, id) {
    return Ember.RSVP.resolve({ id: 1, name: "Tom Dale", dogs: [1] });
  };

  adapter.updateRecord = function(store, type, record) {
    return new Ember.RSVP.Promise(function(resolve, reject) {
      store.push('person', { id: 1, name: "Tom Dale", dogs: [1, 2] });
      store.push('dog', { id: 2, name: "Scruffles" });
      resolve({ id: 1, name: "Scruffy" });
    });
  };

  adapter.findMany = function(store, type, ids) {
    ok(false, "Should not get here");
  };

  store.find('person', 1).then(async(function(person) {
    return Ember.RSVP.hash({ tom: person, dog: store.find('dog', 1) });
  })).then(async(function(records) {
    records.tom.get('dogs');
    return records.dog.save();
  })).then(async(function(tom) {
    ok(true, "Tom was saved");
  }));
});

test("relationships don't get reset if the links is the same", function() {
  Person.reopen({
    dogs: DS.hasMany({ async: true })
  });

  var count = 0;

  adapter.findHasMany = function() {
    ok(count++ === 0, "findHasMany is only called once");

    return Ember.RSVP.resolve([{ id: 1, name: "Scruffy" }]);
  };

  store.push('person', { id: 1, name: "Tom Dale", links: { dogs: "/dogs" } });

  var tom, dogs;

  store.find('person', 1).then(async(function(person) {
    tom = person;
    dogs = tom.get('dogs');
    return dogs;
  })).then(async(function(dogs) {
    equal(dogs.get('length'), 1, "The dogs are loaded");
    store.push('person', { id: 1, name: "Tom Dale", links: { dogs: "/dogs" } });
    ok(tom.get('dogs') instanceof DS.PromiseArray, 'dogs is a promise');
    return tom.get('dogs');
  })).then(async(function(dogs) {
    equal(dogs.get('length'), 1, "The same dogs are loaded");
  }));
});


test("async hasMany always returns a promise", function() {
  Person.reopen({
    dogs: DS.hasMany({ async: true })
  });

  adapter.createRecord = function(store, type, record) {
    var hash = { name: "Tom Dale" };
    hash.dogs = Ember.A();
    hash.id = 1;
    return Ember.RSVP.resolve(hash);
  };

  var tom = store.createRecord('person', { name: "Tom Dale" });
  ok(tom.get('dogs') instanceof DS.PromiseArray, "dogs is a promise before save");

  tom.save().then(async(function() {
    ok(tom.get('dogs') instanceof DS.PromiseArray, "dogs is a promise after save");
  }));
});

})();

(function() {
var get = Ember.get, set = Ember.set;

var Person, store, array, moreArray;

module("integration/all - DS.Store#all()", {
  setup: function() {
    array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }];
    moreArray = [{ id: 3, name: "Scumbag Bryn" }];
    Person = DS.Model.extend({ name: DS.attr('string') });

    store = createStore({ person: Person });
  },
  teardown: function() {
    store.destroy();
    Person = null;
    array = null;
  }
});

test("store.all('person') should return all records and should update with new ones", function() {
  store.pushMany('person', array);

  var all = store.all('person');
  equal(get(all, 'length'), 2);

  store.pushMany('person', moreArray);

  equal(get(all, 'length'), 3);
});

})();

(function() {
var app, container;

/**
  These tests ensure that Ember Data works with Ember.js' application
  initialization and dependency injection APIs.
*/

module("integration/application - Injecting a Custom Store", {
  setup: function() {
    Ember.run(function() {
      app = Ember.Application.create({
        Store: DS.Store.extend({ isCustom: true }),
        FooController: Ember.Controller.extend(),
        ApplicationView: Ember.View.extend(),
        BazController: {},
        ApplicationController: Ember.View.extend()
      });
    });

    container = app.__container__;
  },

  teardown: function() {
    app.destroy();
    Ember.BOOTED = false;
  }
});

test("If a Store property exists on an Ember.Application, it should be instantiated.", function() {
  ok(container.lookup('store:main').get('isCustom'), "the custom store was instantiated");
});

test("If a store is instantiated, it should be made available to each controller.", function() {
  var fooController = container.lookup('controller:foo');
  ok(fooController.get('store.isCustom'), "the custom store was injected");
});

module("integration/application - Injecting the Default Store", {
  setup: function() {
    Ember.run(function() {
      app = Ember.Application.create({
        FooController: Ember.Controller.extend(),
        ApplicationView: Ember.View.extend(),
        BazController: {},
        ApplicationController: Ember.View.extend()
      });
    });

    container = app.__container__;
  },

  teardown: function() {
    app.destroy();
    Ember.BOOTED = false;
  }
});

test("If a Store property exists on an Ember.Application, it should be instantiated.", function() {
  ok(container.lookup('store:main') instanceof DS.Store, "the store was instantiated");
});

test("If a store is instantiated, it should be made available to each controller.", function() {
  var fooController = container.lookup('controller:foo');
  ok(fooController.get('store') instanceof DS.Store, "the store was injected");
});

test("the DS namespace should be accessible", function() {
  ok(Ember.Namespace.byName('DS') instanceof Ember.Namespace, "the DS namespace is accessible");
});
})();

(function() {
var get = Ember.get, set = Ember.set;
var serializer, adapter, store;
var Post, Comment, env;

module("integration/client_id_generation - Client-side ID Generation", {
  setup: function() {
    Comment = DS.Model.extend({
      post: DS.belongsTo('post')
    });

    Post = DS.Model.extend({
      comments: DS.hasMany('comment')
    });

    env = setupStore({
      post: Post,
      comment: Comment
    });
  },

  teardown: function() {
    env.container.destroy();
  }
});

test("If an adapter implements the `generateIdForRecord` method, the store should be able to assign IDs without saving to the persistence layer.", function() {
  expect(6);

  var idCount = 1;

  env.adapter.generateIdForRecord = function(passedStore, record) {
    equal(env.store, passedStore, "store is the first parameter");

    return "id-" + idCount++;
  };

  env.adapter.createRecord = function(store, type, record) {
    if (type === Comment) {
      equal(get(record, 'id'), 'id-1', "Comment passed to `createRecord` has 'id-1' assigned");
      return Ember.RSVP.resolve();
    } else {
      equal(get(record, 'id'), 'id-2', "Post passed to `createRecord` has 'id-2' assigned");
      return Ember.RSVP.resolve();
    }
  };

  var comment = env.store.createRecord('comment');
  var post = env.store.createRecord('post');

  equal(get(comment, 'id'), 'id-1', "comment is assigned id 'id-1'");
  equal(get(post, 'id'), 'id-2', "post is assigned id 'id-2'");

  // Despite client-generated IDs, calling commit() on the store should still
  // invoke the adapter's `createRecord` method.
  comment.save();
  post.save();
});

})();

(function() {
var App, store, debugAdapter, get = Ember.get;

module("DS.DebugAdapter", {
  setup: function() {
    Ember.run(function() {
      App = Ember.Application.create({
        toString: function() { return 'App'; }
      });

      App.Store = DS.Store.extend({
        adapter: DS.Adapter.extend()
      });

      App.Post = DS.Model.extend({
        title: DS.attr('string')
      });

      App.advanceReadiness();
    });

    store = App.__container__.lookup('store:main');
    debugAdapter = App.__container__.lookup('dataAdapter:main');

    debugAdapter.reopen({
      getModelTypes: function() {
        return Ember.A([App.Post]);
      }
    });
  },
  teardown: function() {
    App.destroy();
  }
});

test("Watching Model Types", function() {
  expect(5);

  var added = function(types) {
    equal(types.length, 1);
    equal(types[0].name, 'App.Post');
    equal(types[0].count, 0);
    strictEqual(types[0].object, App.Post);
  };

  var updated = function(types) {
    equal(types[0].count, 1);
  };

  debugAdapter.watchModelTypes(added, updated);

  store.push('post', {id: 1, title: 'Post Title'});
});

test("Watching Records", function() {
  var post, args, record;

  Ember.run(function() {
    store.push('post', { id: '1', title: 'Clean Post'});
  });

  var callback = function() {
    args = arguments;
  };

  debugAdapter.watchRecords(App.Post, callback, callback, callback);

  equal(get(args[0], 'length'), 1);
  record = args[0][0];
  deepEqual(record.columnValues, { id: '1', title: 'Clean Post'} );
  deepEqual(record.filterValues, { isNew: false, isModified: false, isClean: true } );
  deepEqual(record.searchKeywords, ['1', 'Clean Post'] );
  deepEqual(record.color, 'black' );

  Ember.run(function() {
    post = store.find('post', 1);
  });

  Ember.run(function() {
    post.set('title', 'Modified Post');
  });

  record = args[0][0];
  deepEqual(record.columnValues, { id: '1', title: 'Modified Post'});
  deepEqual(record.filterValues, { isNew: false, isModified: true, isClean: false });
  deepEqual(record.searchKeywords, ['1', 'Modified Post'] );
  deepEqual(record.color, 'blue' );

  post = store.createRecord('post', { id: '2', title: 'New Post' });
  record = args[0][0];
  deepEqual(record.columnValues, { id: '2', title: 'New Post'});
  deepEqual(record.filterValues, { isNew: true, isModified: false, isClean: false });
  deepEqual(record.searchKeywords, ['2', 'New Post'] );
  deepEqual(record.color, 'green' );

  Ember.run(post, 'deleteRecord');

  var index = args[0];
  var count = args[1];
  equal(index, 1);
  equal(count, 1);
});

})();

(function() {
var get = Ember.get, set = Ember.set;
var forEach = Ember.EnumerableUtils.forEach;
var indexOf = Ember.EnumerableUtils.indexOf;

var Person, store, env, array, recordArray;

var shouldContain = function(array, item) {
  ok(indexOf(array, item) !== -1, "array should contain "+item.get('name'));
};

var shouldNotContain = function(array, item) {
  ok(indexOf(array, item) === -1, "array should not contain "+item.get('name'));
};

module("integration/filter - DS.Model updating", {
  setup: function() {
    array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
    Person = DS.Model.extend({ name: DS.attr('string') });

    env = setupStore({ person: Person });
    store = env.store;
  },
  teardown: function() {
    store.destroy();
    Person = null;
    array = null;
  }
});

test("when a DS.Model updates its attributes, its changes affect its filtered Array membership", function() {
  store.pushMany('person', array);

  var people = store.filter('person', function(hash) {
    if (hash.get('name').match(/Katz$/)) { return true; }
  });

  equal(get(people, 'length'), 1, "precond - one item is in the RecordArray");

  var person = people.objectAt(0);

  equal(get(person, 'name'), "Scumbag Katz", "precond - the item is correct");

  set(person, 'name', "Yehuda Katz");

  equal(get(people, 'length'), 1, "there is still one item");
  equal(get(person, 'name'), "Yehuda Katz", "it has the updated item");

  set(person, 'name', "Yehuda Katz-Foo");

  equal(get(people, 'length'), 0, "there are now no items");
});

test("a record array can have a filter on it", function() {
  store.pushMany('person', array);

  var recordArray = store.filter('person', function(hash) {
    if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
  });

  equal(get(recordArray, 'length'), 2, "The Record Array should have the filtered objects on it");

  store.push('person', { id: 4, name: "Scumbag Koz" });

  equal(get(recordArray, 'length'), 3, "The Record Array should be updated as new items are added to the store");

  store.push('person', { id: 1, name: "Scumbag Tom" });

  equal(get(recordArray, 'length'), 2, "The Record Array should be updated as existing members are updated");
});

test("a filtered record array includes created elements", function() {
  store.pushMany('person', array);

  var recordArray = store.filter('person', function(hash) {
    if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
  });

  equal(get(recordArray, 'length'), 2, "precond - The Record Array should have the filtered objects on it");

  store.createRecord('person', { name: "Scumbag Koz" });

  equal(get(recordArray, 'length'), 3, "The record array has the new object on it");
});

test("a Record Array can update its filter", function() {
  set(store, 'adapter', DS.Adapter.extend({
    deleteRecord: function(store, type, record) {
      return Ember.RSVP.resolve();
    }
  }));

  store.pushMany('person', array);

  var dickens = store.createRecord('person', { id: 4, name: "Scumbag Dickens" });
  dickens.deleteRecord();

  var asyncDale = store.find('person', 1);
  var asyncKatz = store.find('person', 2);
  var asyncBryn = store.find('person', 3);

  store.filter(Person, function(hash) {
    if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
  }).then(async(function(recordArray) {

    Ember.RSVP.hash({ dale: asyncDale, katz: asyncKatz, bryn: asyncBryn }).then(async(function(records) {
      shouldContain(recordArray, records.dale);
      shouldContain(recordArray, records.katz);
      shouldNotContain(recordArray, records.bryn);
      shouldNotContain(recordArray, dickens);

      recordArray.set('filterFunction', function(hash) {
        if (hash.get('name').match(/Katz/)) { return true; }
      });

      equal(get(recordArray, 'length'), 1, "The Record Array should have one object on it");

      Ember.run(function() {
        store.push('person', { id: 5, name: "Other Katz" });
      });

      equal(get(recordArray, 'length'), 2, "The Record Array now has the new object matching the filter");

      Ember.run(function() {
        store.push('person', { id: 6, name: "Scumbag Demon" });
      });

      equal(get(recordArray, 'length'), 2, "The Record Array doesn't have objects matching the old filter");
    }));
  }));
});

test("a Record Array can update its filter and notify array observers", function() {
  set(store, 'adapter', DS.Adapter.extend({
    deleteRecord: function(store, type, record) {
      return Ember.RSVP.resolve();
    }
  }));

  store.pushMany('person', array);

  var dickens = store.createRecord('person', { id: 4, name: "Scumbag Dickens" });
  dickens.deleteRecord();

  var asyncDale = store.find('person', 1);
  var asyncKatz = store.find('person', 2);
  var asyncBryn = store.find('person', 3);

  store.filter(Person, function(hash) {
    if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
  }).then(async(function(recordArray) {

    var didChangeIdx, didChangeRemoved = 0, didChangeAdded = 0;

    var arrayObserver = {
      arrayWillChange: Ember.K,

      arrayDidChange: function(array, idx, removed, added) {
        didChangeIdx = idx;
        didChangeRemoved += removed;
        didChangeAdded += added;
      }
    };

    recordArray.addArrayObserver(arrayObserver);

    recordArray.set('filterFunction', function(hash) {
      if (hash.get('name').match(/Katz/)) { return true; }
    });

    Ember.RSVP.all([ asyncDale, asyncKatz, asyncBryn ]).then(async(function() {
      equal(didChangeRemoved, 1, "removed one item from array");
      didChangeRemoved = 0;

      Ember.run(function() {
        store.push('person', { id: 5, name: "Other Katz" });
      });

      equal(didChangeAdded, 1, "one item was added");
      didChangeAdded = 0;

      equal(recordArray.objectAt(didChangeIdx).get('name'), "Other Katz");

      Ember.run(function() {
        store.push('person', { id: 6, name: "Scumbag Demon" });
      });

      equal(didChangeAdded, 0, "did not get called when an object that doesn't match is added");

      Ember.run(function() {
        recordArray.set('filterFunction', function(hash) {
          if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
        });
      });

      equal(didChangeAdded, 2, "one item is added when going back");
      equal(recordArray.objectAt(didChangeIdx).get('name'), "Scumbag Demon");
      equal(recordArray.objectAt(didChangeIdx-1).get('name'), "Scumbag Dale");
    }));
  }));
});

test("it is possible to filter by computed properties", function() {
  Person.reopen({
    name: DS.attr('string'),
    upperName: Ember.computed(function() {
      return this.get('name').toUpperCase();
    }).property('name')
  });

  var filter = store.filter('person', function(person) {
    return person.get('upperName') === "TOM DALE";
  });

  equal(filter.get('length'), 0, "precond - the filter starts empty");

  store.push('person', { id: 1, name: "Tom Dale" });

  equal(filter.get('length'), 1, "the filter now has a record in it");

  store.find('person', 1).then(async(function(person) {
    Ember.run(function() {
      person.set('name', "Yehuda Katz");
    });

    equal(filter.get('length'), 0, "the filter is empty again");
  }));
});

test("a filter created after a record is already loaded works", function() {
  Person.reopen({
    name: DS.attr('string'),
    upperName: Ember.computed(function() {
      return this.get('name').toUpperCase();
    }).property('name')
  });

  store.push('person', { id: 1, name: "Tom Dale" });

  var filter = store.filter('person', function(person) {
    return person.get('upperName') === "TOM DALE";
  });

  equal(filter.get('length'), 1, "the filter now has a record in it");
  asyncEqual(filter.objectAt(0), store.find('person', 1));
});

test("it is possible to filter by state flags", function() {
  set(store, 'adapter', DS.Adapter.extend({
    find: function(store, type, id) {
      return Ember.RSVP.resolve({ id: id, name: "Tom Dale" });
    }
  }));

  var filter = store.filter(Person, function(person) {
    return person.get('isLoaded');
  });

  equal(filter.get('length'), 0, "precond - there are no records yet");

  Ember.run(function() {
    var asyncPerson = store.find('person', 1);

    // Ember.run will block `find` from being synchronously
    // resolved in test mode

    equal(filter.get('length'), 0, "the unloaded record isn't in the filter");

    asyncPerson.then(async(function(person) {
      equal(filter.get('length'), 1, "the now-loaded record is in the filter");
      asyncEqual(filter.objectAt(0), store.find('person', 1));
    }));
  });
});

test("it is possible to filter loaded records by dirtiness", function() {
  set(store, 'adapter', DS.Adapter.extend({
    updateRecord: function() {
      return Ember.RSVP.resolve();
    }
  }));

  var filter = store.filter('person', function(person) {
    return !person.get('isDirty');
  });

  store.push('person', { id: 1, name: "Tom Dale" });

  store.find('person', 1).then(async(function(person) {
    equal(filter.get('length'), 1, "the clean record is in the filter");

    // Force synchronous update of the filter, even though
    // we're already inside a run loop
    Ember.run(function() {
      person.set('name', "Yehuda Katz");
    });

    equal(filter.get('length'), 0, "the now-dirty record is not in the filter");

    return person.save();
  })).then(async(function(person) {
    equal(filter.get('length'), 1, "the clean record is back in the filter");
  }));
});

test("it is possible to filter created records by dirtiness", function() {
  set(store, 'adapter', DS.Adapter.extend({
    createRecord: function() {
      return Ember.RSVP.resolve();
    }
  }));

  var filter = store.filter('person', function(person) {
    return !person.get('isDirty');
  });

  var person = store.createRecord('person', {
    id: 1,
    name: "Tom Dale"
  });

  equal(filter.get('length'), 0, "the dirty record is not in the filter");

  person.save().then(async(function(person) {
    equal(filter.get('length'), 1, "the clean record is in the filter");
  }));
});


// SERVER SIDE TESTS
var edited;

var clientEdits = function(ids) {
  edited = [];

  forEach(ids, function(id) {
    // wrap in an Ember.run to guarantee coalescence of the
    // iterated `set` calls and promise resolution.
    Ember.run(function() {
      store.find('person', id).then(function(person) {
        edited.push(person);
        person.set('name', 'Client-side ' + id );
      });
    });
  });
};

var clientCreates = function(names) {
  edited = [];

  // wrap in an Ember.run to guarantee coalescence of the
  // iterated `set` calls.
  Ember.run( function() {
    forEach(names, function( name ) {
      edited.push(store.createRecord('person', { name: 'Client-side ' + name }));
    });
  });
};

var serverResponds = function(){
  forEach(edited, function(person) { person.save(); });
};

var setup = function(serverCallbacks) {
  set(store, 'adapter', DS.Adapter.extend(serverCallbacks));

  store.pushMany('person', array);

  recordArray = store.filter('person', function(hash) {
    if (hash.get('name').match(/Scumbag/)) { return true; }
  });

  equal(get(recordArray, 'length'), 3, "The filter function should work");
};

test("a Record Array can update its filter after server-side updates one record", function() {
  setup({
    updateRecord: function(store, type, record) {
      return Ember.RSVP.resolve({id: 1, name: "Scumbag Server-side Dale"});
    }
  });

  clientEdits([1]);
  equal(get(recordArray, 'length'), 2, "The record array updates when the client changes records");

  serverResponds();
  equal(get(recordArray, 'length'), 3, "The record array updates when the server changes one record");
});

test("a Record Array can update its filter after server-side updates multiple records", function() {
  setup({
    updateRecord: function(store, type, record) {
      switch (record.get('id')) {
        case "1":
          return Ember.RSVP.resolve({ id: 1, name: "Scumbag Server-side Dale" });
        case "2":
          return Ember.RSVP.resolve({ id: 2, name: "Scumbag Server-side Katz" });
      }
    }
  });

  clientEdits([1,2]);
  equal(get(recordArray, 'length'), 1, "The record array updates when the client changes records");

  serverResponds();
  equal(get(recordArray, 'length'), 3, "The record array updates when the server changes multiple records");
});

test("a Record Array can update its filter after server-side creates one record", function() {
  setup({
    createRecord: function(store, type, record) {
      return Ember.RSVP.resolve({id: 4, name: "Scumbag Server-side Tim"});
    }
  });

  clientCreates(["Tim"]);
  equal(get(recordArray, 'length'), 3, "The record array does not include non-matching records");

  serverResponds();
  equal(get(recordArray, 'length'), 4, "The record array updates when the server creates a record");
});

test("a Record Array can update its filter after server-side creates multiple records", function() {
  setup({
    createRecord: function(store, type, record) {
      switch (record.get('name')) {
        case "Client-side Mike":
          return Ember.RSVP.resolve({id: 4, name: "Scumbag Server-side Mike"});
        case "Client-side David":
          return Ember.RSVP.resolve({id: 5, name: "Scumbag Server-side David"});
      }
    }
  });

  clientCreates(["Mike", "David"]);
  equal(get(recordArray, 'length'), 3, "The record array does not include non-matching records");

  serverResponds();
  equal(get(recordArray, 'length'), 5, "The record array updates when the server creates multiple records");
});


})();

(function() {
var Person, env;
var attr = DS.attr;
var resolve = Ember.RSVP.resolve;

module("integration/lifecycle_hooks - Lifecycle Hooks", {
  setup: function() {
    Person = DS.Model.extend({
      name: attr('string')
    });

    env = setupStore({
      person: Person
    });
  },

  teardown: function() {
    env.container.destroy();
  }
});

asyncTest("When the adapter acknowledges that a record has been created, a `didCreate` event is triggered.", function() {
  expect(3);

  env.adapter.createRecord = function(store, type, record) {
    return resolve({ id: 99, name: "Yehuda Katz" });
  };

  var person = env.store.createRecord(Person, { name: "Yehuda Katz" });

  person.on('didCreate', function() {
    equal(this, person, "this is bound to the record");
    equal(this.get('id'), "99", "the ID has been assigned");
    equal(this.get('name'), "Yehuda Katz", "the attribute has been assigned");
    start();
  });

  person.save();
});

test("When the adapter acknowledges that a record has been created without a new data payload, a `didCreate` event is triggered.", function() {
  expect(3);

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.resolve();
  };

  var person = env.store.createRecord(Person, { id: 99, name: "Yehuda Katz" });

  person.on('didCreate', function() {
    equal(this, person, "this is bound to the record");
    equal(this.get('id'), "99", "the ID has been assigned");
    equal(this.get('name'), "Yehuda Katz", "the attribute has been assigned");
  });

  person.save();
});

})();

(function() {
var Comment, Post, env;

module("integration/records/collection_save - Save Collection of Records", {
  setup: function() {
    var Post = DS.Model.extend({
      title: DS.attr('string')
    });

    Post.toString = function() { return "Post"; };

    env = setupStore({ post: Post });
  },

  teardown: function() {
    env.container.destroy();
  }
});

test("Collection will resolve save on success", function() {
  expect(1);
  env.store.createRecord('post', {title: 'Hello'});
  env.store.createRecord('post', {title: 'World'});

  var posts = env.store.all('post');

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.resolve({ id: 123 });
  };

  posts.save().then(async(function() {
    ok(true, 'save operation was resolved');
  }));
});

test("Collection will reject save on error", function() {
  env.store.createRecord('post', {title: 'Hello'});
  env.store.createRecord('post', {title: 'World'});

  var posts = env.store.all('post');

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.reject();
  };

  posts.save().then(function() {}, async(function() {
    ok(true, 'save operation was rejected');
  }));
});

test("Retry is allowed in a failure handler", function() {
  env.store.createRecord('post', {title: 'Hello'});
  env.store.createRecord('post', {title: 'World'});

  var posts = env.store.all('post');

  var count = 0;

  env.adapter.createRecord = function(store, type, record) {
    if (count++ === 0) {
      return Ember.RSVP.reject();
    } else {
      return Ember.RSVP.resolve({ id: 123 });
    }
  };

  env.adapter.updateRecord = function(store, type, record) {
    return Ember.RSVP.resolve({ id: 123 });
  };

  posts.save().then(function() {}, async(function() {
    return posts.save();
  })).then(async(function(post) {
    equal(posts.get('firstObject.id'), '123', "The post ID made it through");
  }));
});

test("Collection will reject save on invalid", function() {
  expect(1);
  env.store.createRecord('post', {title: 'Hello'});
  env.store.createRecord('post', {title: 'World'});

  var posts = env.store.all('post');

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.reject({ title: 'invalid' });
  };

  posts.save().then(function() {}, async(function() {
    ok(true, 'save operation was rejected');
  }));
});
})();

(function() {
var get = Ember.get, set = Ember.set;
var attr = DS.attr;
var Person, env;

module("integration/deletedRecord - Deleting Records", {
  setup: function() {
    Person = DS.Model.extend({
      name: attr('string')
    });

    Person.toString = function() { return "Person"; };

    env = setupStore({
      person: Person
    });
  },

  teardown: function() {
    Ember.run(function(){
      env.container.destroy();
    });
  }
});

test("records can be deleted during record array enumeration", function () {
  var adam = env.store.push('person', {id: 1, name: "Adam Sunderland"});
  var dave = env.store.push('person', {id: 2, name: "Dave Sunderland"});
  var all  = env.store.all('person');

  // pre-condition
  equal(all.get('length'), 2, 'expected 2 records');

  Ember.run(function(){
    all.forEach(function(record) {
      record.deleteRecord();
    });
  });

  equal(all.get('length'), 0, 'expected 0 records');
});

test("when deleted records are rolled back, they are still in their previous record arrays", function () {
  var jaime = env.store.push('person', {id: 1, name: "Jaime Lannister"});
  var cersei = env.store.push('person', {id: 2, name: "Cersei Lannister"});
  var all = env.store.all('person');
  var filtered = env.store.filter('person', function () {
    return true;
  });

  equal(all.get('length'), 2, 'precond - we start with two people');
  equal(filtered.get('length'), 2, 'precond - we start with two people');

  Ember.run(function () {
    jaime.deleteRecord();
    jaime.rollback();
  });

  equal(all.get('length'), 2, 'record was not removed');
  equal(filtered.get('length'), 2, 'record was not removed');
});

})();

(function() {
var get = Ember.get, set = Ember.set;
var attr = DS.attr;
var Person, env;

module("integration/reload - Reloading Records", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: attr('string'),
      name: attr('string'),
      firstName: attr('string'),
      lastName: attr('string')
    });

    Person.toString = function() { return "Person"; };

    env = setupStore({ person: Person });
  },

  teardown: function() {
    env.container.destroy();
  }
});

test("When a single record is requested, the adapter's find method should be called unless it's loaded.", function() {
  var count = 0;

  env.adapter.find = function(store, type, id) {
    if (count === 0) {
      count++;
      return Ember.RSVP.resolve({ id: id, name: "Tom Dale" });
    } else if (count === 1) {
      count++;
      return Ember.RSVP.resolve({ id: id, name: "Braaaahm Dale" });
    } else {
      ok(false, "Should not get here");
    }
  };

  env.store.find('person', 1).then(async(function(person) {
    equal(get(person, 'name'), "Tom Dale", "The person is loaded with the right name");
    equal(get(person, 'isLoaded'), true, "The person is now loaded");
    var promise = person.reload();
    equal(get(person, 'isReloading'), true, "The person is now reloading");
    return promise;
  })).then(async(function(person) {
    equal(get(person, 'isReloading'), false, "The person is no longer reloading");
    equal(get(person, 'name'), "Braaaahm Dale", "The person is now updated with the right name");
  }));
});

test("When a record is reloaded and fails, it can try again", function() {
  var tom = env.store.push('person', { id: 1, name: "Tom Dale" });

  var count = 0;
  env.adapter.find = function(store, type, id) {
    if (count++ === 0) {
      return Ember.RSVP.reject();
    } else {
      return Ember.RSVP.resolve({ id: 1, name: "Thomas Dale" });
    }
  };

  tom.reload().then(null, async(function() {
    equal(tom.get('isError'), true, "Tom is now errored");
    return tom.reload();
  })).then(async(function(person) {
    equal(person, tom, "The resolved value is the record");
    equal(tom.get('isError'), false, "Tom is no longer errored");
    equal(tom.get('name'), "Thomas Dale", "the updates apply");
  }));
});

test("When a record is loaded a second time, isLoaded stays true", function() {
  env.store.push('person', { id: 1, name: "Tom Dale" });

  env.store.find('person', 1).then(async(function(person) {
    equal(get(person, 'isLoaded'), true, "The person is loaded");
    person.addObserver('isLoaded', isLoadedDidChange);

    // Reload the record
    env.store.push('person', { id: 1, name: "Tom Dale" });
    equal(get(person, 'isLoaded'), true, "The person is still loaded after load");

    person.removeObserver('isLoaded', isLoadedDidChange);
  }));

  function isLoadedDidChange() {
    // This shouldn't be hit
    equal(get(this, 'isLoaded'), true, "The person is still loaded after change");
  }
});

test("When a record is reloaded, its async hasMany relationships still work", function() {
  env.container.register('model:person', DS.Model.extend({
    name: DS.attr(),
    tags: DS.hasMany('tag', { async: true })
  }));

  env.container.register('model:tag', DS.Model.extend({
    name: DS.attr()
  }));

  var tags = { 1: "hipster", 2: "hair" };

  env.adapter.find = function(store, type, id) {
    switch (type.typeKey) {
      case 'person':
        return Ember.RSVP.resolve({ id: 1, name: "Tom", tags: [1, 2] });
      case 'tag':
        return Ember.RSVP.resolve({ id: id, name: tags[id] });
    }
  };

  var tom;

  env.store.find('person', 1).then(async(function(person) {
    tom = person;
    equal(person.get('name'), "Tom", "precond");

    return person.get('tags');
  })).then(async(function(tags) {
    deepEqual(tags.mapBy('name'), [ 'hipster', 'hair' ]);

    return tom.reload();
  })).then(async(function(person) {
    equal(person.get('name'), "Tom", "precond");

    return person.get('tags');
  })).then(async(function(tags) {
    deepEqual(tags.mapBy('name'), [ 'hipster', 'hair' ], "The tags are still there");
  }));
});

})();

(function() {
var Comment, Post, env;

module("integration/records/save - Save Record", {
  setup: function() {
    var Post = DS.Model.extend({
      title: DS.attr('string')
    });

    Post.toString = function() { return "Post"; };

    env = setupStore({ post: Post });
  },

  teardown: function() {
    env.container.destroy();
  }
});

test("Will resolve save on success", function() {
  expect(1);
  var post = env.store.createRecord('post', {title: 'toto'});

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.resolve({ id: 123 });
  };

  post.save().then(async(function() {
    ok(true, 'save operation was resolved');
  }));
});

test("Will reject save on error", function() {
  var post = env.store.createRecord('post', {title: 'toto'});

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.reject();
  };

  post.save().then(function() {}, async(function() {
    ok(true, 'save operation was rejected');
  }));
});

test("Retry is allowed in a failure handler", function() {
  var post = env.store.createRecord('post', {title: 'toto'});

  var count = 0;

  env.adapter.createRecord = function(store, type, record) {
    if (count++ === 0) {
      return Ember.RSVP.reject();
    } else {
      return Ember.RSVP.resolve({ id: 123 });
    }
  };

  post.save().then(function() {}, async(function() {
    return post.save();
  })).then(async(function(post) {
    equal(post.get('id'), '123', "The post ID made it through");
  }));
});

test("Will reject save on invalid", function() {
  expect(1);
  var post = env.store.createRecord('post', {title: 'toto'});

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.reject({ title: 'invalid' });
  };

  post.save().then(function() {}, async(function() {
    ok(true, 'save operation was rejected');
  }));
});

})();

(function() {
var get = Ember.get, set = Ember.set;
var attr = DS.attr;
var Person, env;

module("integration/unload - Unloading Records", {
  setup: function() {
    Person = DS.Model.extend({
      name: attr('string')
    });

    Person.toString = function() { return "Person"; };

    env = setupStore({ person: Person });
  },

  teardown: function() {
    Ember.run(function(){
      env.container.destroy();
    });
  }
});

test("can unload a single record", function () {
  var adam = env.store.push('person', {id: 1, name: "Adam Sunderland"});

  Ember.run(function(){
    adam.unloadRecord();
  });

  equal(env.store.all('person').get('length'), 0);
});

test("can unload all records for a given type", function () {
  var adam = env.store.push('person', {id: 1, name: "Adam Sunderland"});
  var bob = env.store.push('person', {id: 2, name: "Bob Bobson"});

  Ember.run(function(){
    env.store.unloadAll('person');
  });

  equal(env.store.all('person').get('length'), 0);
});

test("removes findAllCache after unloading all records", function () {
  var adam = env.store.push('person', {id: 1, name: "Adam Sunderland"});
  var bob = env.store.push('person', {id: 2, name: "Bob Bobson"});

  Ember.run(function(){
    env.store.all('person');
    env.store.unloadAll('person');
  });

  equal(env.store.all('person').get('length'), 0);
});

})();

(function() {
var env, store, User, Message, Post, Comment;
var get = Ember.get, set = Ember.set;

var attr = DS.attr, hasMany = DS.hasMany, belongsTo = DS.belongsTo;
var resolve = Ember.RSVP.resolve, hash = Ember.RSVP.hash;

function stringify(string) {
  return function() { return string; };
}

module("integration/relationship/belongs_to Belongs-To Relationships", {
  setup: function() {
    User = DS.Model.extend({
      name: attr('string'),
      messages: hasMany('message', {polymorphic: true}),
      favouriteMessage: belongsTo('message', {polymorphic: true})
    });
    User.toString = stringify('User');

    Message = DS.Model.extend({
      user: belongsTo('user'),
      created_at: attr('date')
    });
    Message.toString = stringify('Message');

    Post = Message.extend({
      title: attr('string'),
      comments: hasMany('comment')
    });
    Post.toString = stringify('Post');

    Comment = Message.extend({
      body: DS.attr('string'),
      message: DS.belongsTo('message', { polymorphic: true })
    });
    Comment.toString = stringify('Comment');

    env = setupStore({
      user: User,
      post: Post,
      comment: Comment,
      message: Message
    });

    env.container.register('serializer:user', DS.JSONSerializer.extend({
      attrs: {
        favouriteMessage: { embedded: 'always' }
      }
    }));

    store = env.store;
  },

  teardown: function() {
    env.container.destroy();
  }
});

test("The store can materialize a non loaded monomorphic belongsTo association", function() {
  expect(1);

  env.store.modelFor('post').reopen({
    user: DS.belongsTo('user', { async: true })
  });

  env.adapter.find = function(store, type, id) {
    ok(true, "The adapter's find method should be called");
    return Ember.RSVP.resolve({ id: 1 });
  };

  env.store.push('post', { id: 1, user: 2});

  env.store.find('post', 1).then(async(function(post) {
    post.get('user');
  }));
});

test("Only a record of the same type can be used with a monomorphic belongsTo relationship", function() {
  expect(1);

  store.push('post', { id: 1 });
  store.push('comment', { id: 2 });

  hash({ post: store.find('post', 1), comment: store.find('comment', 2) }).then(async(function(records) {
    expectAssertion(function() {
      records.post.set('user', records.comment);
    }, /You can only add a 'user' record to this relationship/);
  }));
});

test("Only a record of the same base type can be used with a polymorphic belongsTo relationship", function() {
  expect(1);
  store.push('comment', { id: 1 });
  store.push('comment', { id: 2 });
  store.push('post', { id: 1 });
  store.push('user', { id: 3 });

  var asyncRecords = hash({
    user: store.find('user', 3),
    post: store.find('post', 1),
    comment: store.find('comment', 1),
    anotherComment: store.find('comment', 2)
  });

  asyncRecords.then(async(function(records) {
    var comment = records.comment;

    comment.set('message', records.anotherComment);
    comment.set('message', records.post);
    comment.set('message', null);

    expectAssertion(function() {
      comment.set('message', records.user);
    }, /You can only add a 'message' record to this relationship/);
  }));
});

test("The store can load a polymorphic belongsTo association", function() {
  env.store.push('post', { id: 1 });
  env.store.push('comment', { id: 2, message: 1, messageType: 'post' });

  hash({ message: store.find('post', 1), comment: store.find('comment', 2) }).then(async(function(records) {
    equal(records.comment.get('message'), records.message);
  }));
});

test("The store can serialize a polymorphic belongsTo association", function() {
  env.serializer.serializePolymorphicType = function(record, json, relationship) {
    ok(true, "The serializer's serializePolymorphicType method should be called");
    json["message_type"] = "post";
  };
  env.store.push('post', { id: 1 });
  env.store.push('comment', { id: 2, message: 1, messageType: 'post' });

  store.find('comment', 2).then(async(function(comment) {
    var serialized = store.serialize(comment, { includeId: true });
    equal(serialized['message'], 1);
    equal(serialized['message_type'], 'post');
  }));
});

test("A serializer can materialize a belongsTo as a link that gets sent back to findBelongsTo", function() {
  var Group = DS.Model.extend({
    people: DS.hasMany()
  });

  var Person = DS.Model.extend({
    group: DS.belongsTo({ async: true })
  });

  env.container.register('model:group', Group);
  env.container.register('model:person', Person);

  store.push('person', { id: 1, links: { group: '/people/1/group' } });

  env.adapter.find = function() {
    throw new Error("Adapter's find method should not be called");
  };

  env.adapter.findBelongsTo = async(function(store, record, link, relationship) {
    equal(relationship.type, Group);
    equal(relationship.key, 'group');
    equal(link, "/people/1/group");

    return Ember.RSVP.resolve({ id: 1, people: [1] });
  });

  env.store.find('person', 1).then(async(function(person) {
    return person.get('group');
  })).then(async(function(group) {
    ok(group instanceof Group, "A group object is loaded");
    ok(group.get('id') === '1', 'It is the group we are expecting');
  }));
});

test('A record with an async belongsTo relationship always returns a promise for that relationship', function () {
  var Seat = DS.Model.extend({
    person: DS.belongsTo('person')
  });

  var Person = DS.Model.extend({
    seat: DS.belongsTo('seat', { async: true })
  });

  env.container.register('model:seat', Seat);
  env.container.register('model:person', Person);

  store.push('person', { id: 1, links: { seat: '/people/1/seat' } });

  env.adapter.find = function() {
    throw new Error("Adapter's find method should not be called");
  };

  env.adapter.findBelongsTo = async(function(store, record, link, relationship) {
    return Ember.RSVP.resolve({ id: 1});
  });

  env.store.find('person', 1).then(async(function(person) {
    person.get('seat').then(async(function(seat) {
        // this assertion fails too
        // ok(seat.get('person') === person, 'parent relationship should be populated');
        seat.set('person', person);
        ok(person.get('seat').then, 'seat should be a PromiseObject');
    }));
  }));
});

test("TODO (embedded): The store can load an embedded polymorphic belongsTo association", function() {
  expect(0);
  //serializer.keyForEmbeddedType = function() {
    //return 'embeddedType';
  //};

  //adapter.load(store, App.User, { id: 2, favourite_message: { id: 1, embeddedType: 'comment'}});

  //var user = store.find(App.User, 2),
      //message = store.find(App.Comment, 1);

  //equal(user.get('favouriteMessage'), message);
});

test("TODO (embedded): The store can serialize an embedded polymorphic belongsTo association", function() {
  expect(0);
  //serializer.keyForEmbeddedType = function() {
    //return 'embeddedType';
  //};
  //adapter.load(store, App.User, { id: 2, favourite_message: { id: 1, embeddedType: 'comment'}});

  //var user = store.find(App.User, 2),
      //serialized = store.serialize(user, {includeId: true});

  //ok(serialized.hasOwnProperty('favourite_message'));
  //equal(serialized.favourite_message.id, 1);
  //equal(serialized.favourite_message.embeddedType, 'comment');
});

})();

(function() {
var env, User, Contact, Email, Phone, Message, Post, Comment;
var get = Ember.get, set = Ember.set;

var attr = DS.attr, hasMany = DS.hasMany, belongsTo = DS.belongsTo;

function stringify(string) {
  return function() { return string; };
}

module("integration/relationships/has_many - Has-Many Relationships", {
  setup: function() {
    User = DS.Model.extend({
      name: attr('string'),
      messages: hasMany('message', { polymorphic: true }),
      contacts: hasMany()
    });

    Contact = DS.Model.extend({
      user: belongsTo('user')
    });

    Email = Contact.extend({
      email: attr('string')
    });

    Phone = Contact.extend({
      number: attr('string')
    });

    Message = DS.Model.extend({
      user: belongsTo('user'),
      created_at: attr('date')
    });
    Message.toString = stringify('Message');

    Post = Message.extend({
      title: attr('string'),
      comments: hasMany('comment')
    });
    Post.toString = stringify('Post');

    Comment = Message.extend({
      body: DS.attr('string'),
      message: DS.belongsTo('post', { polymorphic: true })
    });
    Comment.toString = stringify('Comment');

    env = setupStore({
      user: User,
      contact: Contact,
      email: Email,
      phone: Phone,
      post: Post,
      comment: Comment,
      message: Message
    });
  },

  teardown: function() {
    env.container.destroy();
  }
});

test("When a hasMany relationship is accessed, the adapter's findMany method should not be called if all the records in the relationship are already loaded", function() {
  expect(0);

  env.adapter.findMany = function() {
    ok(false, "The adapter's find method should not be called");
  };

  env.store.push('post', { id: 1, comments: [ 1 ] });
  env.store.push('comment', { id: 1 });

  env.store.find('post', 1).then(async(function(post) {
    post.get('comments');
  }));
});

// This tests the case where a serializer materializes a has-many
// relationship as a reference that it can fetch lazily. The most
// common use case of this is to provide a URL to a collection that
// is loaded later.
test("A serializer can materialize a hasMany as an opaque token that can be lazily fetched via the adapter's findHasMany hook", function() {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  // When the store asks the adapter for the record with ID 1,
  // provide some fake data.
  env.adapter.find = function(store, type, id) {
    equal(type, Post, "find type was Post");
    equal(id, "1", "find id was 1");

    return Ember.RSVP.resolve({ id: 1, links: { comments: "/posts/1/comments" } });
  };

  env.adapter.findMany = function() {
    throw new Error("Adapter's findMany should not be called");
  };

  env.adapter.findHasMany = function(store, record, link, relationship) {
    equal(relationship.type, Comment, "findHasMany relationship type was Comment");
    equal(relationship.key, 'comments', "findHasMany relationship key was comments");
    equal(link, "/posts/1/comments", "findHasMany link was /posts/1/comments");

    return Ember.RSVP.resolve([
      { id: 1, body: "First" },
      { id: 2, body: "Second" }
    ]);
  };

  env.store.find('post', 1).then(async(function(post) {
    return post.get('comments');
  })).then(async(function(comments) {
    equal(comments.get('isLoaded'), true, "comments are loaded");
    equal(comments.get('length'), 2, "comments have 2 length");
  }));
});

test("An updated `links` value should invalidate a relationship cache", function() {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.createRecord = function(store, type, record) {
    var data = record.serialize();
    return Ember.RSVP.resolve({ id: 1, links: { comments: "/posts/1/comments" } });
  };

  env.adapter.findHasMany = function(store, record, link, relationship) {
    equal(relationship.type, Comment, "findHasMany relationship type was Comment");
    equal(relationship.key, 'comments', "findHasMany relationship key was comments");
    equal(link, "/posts/1/comments", "findHasMany link was /posts/1/comments");

    return Ember.RSVP.resolve([
      { id: 1, body: "First" },
      { id: 2, body: "Second" }
    ]);
  };

  env.store.createRecord('post', {}).save().then(async(function(post) {
    return post.get('comments');
  })).then(async(function(comments) {
    equal(comments.get('isLoaded'), true, "comments are loaded");
    equal(comments.get('length'), 2, "comments have 2 length");
  }));
});

test("When a polymorphic hasMany relationship is accessed, the adapter's findMany method should not be called if all the records in the relationship are already loaded", function() {
  expect(1);

  env.adapter.findMany = function() {
    ok(false, "The adapter's find method should not be called");
  };

  env.store.push('user', { id: 1, messages: [ {id: 1, type: 'post'}, {id: 3, type: 'comment'} ] });
  env.store.push('post', { id: 1 });
  env.store.push('comment', { id: 3 });

  env.store.find('user', 1).then(async(function(user) {
    var messages = user.get('messages');
    equal(messages.get('length'), 2, "The messages are correctly loaded");
  }));
});

test("When a polymorphic hasMany relationship is accessed, the store can call multiple adapters' findMany method if the records are not loaded", function() {
  User.reopen({
    messages: hasMany('message', { polymorphic: true, async: true })
  });

  env.adapter.findMany = function(store, type) {
    if (type === Post) {
      return Ember.RSVP.resolve([{ id: 1 }]);
    } else if (type === Comment) {
      return Ember.RSVP.resolve([{ id: 3 }]);
    }
  };

  env.store.push('user', { id: 1, messages: [ {id: 1, type: 'post'}, {id: 3, type: 'comment'} ] });

  env.store.find('user', 1).then(async(function(user) {
    return user.get('messages');
  })).then(async(function(messages) {
    equal(messages.get('length'), 2, "The messages are correctly loaded");
  }));
});

test("Type can be inferred from the key of a hasMany relationship", function() {
  expect(1);
  env.store.push('user', { id: 1, contacts: [ 1 ] });
  env.store.push('contact', { id: 1 });
  env.store.find('user', 1).then(async(function(user) {
    return user.get('contacts');
  })).then(async(function(contacts) {
    equal(contacts.get('length'), 1, "The contacts relationship is correctly set up");
  }));
});

test("Type can be inferred from the key of an async hasMany relationship", function() {
  User.reopen({
    contacts: DS.hasMany({ async: true })
  });

  expect(1);
  env.store.push('user', { id: 1, contacts: [ 1 ] });
  env.store.push('contact', { id: 1 });
  env.store.find('user', 1).then(async(function(user) {
    return user.get('contacts');
  })).then(async(function(contacts) {
    equal(contacts.get('length'), 1, "The contacts relationship is correctly set up");
  }));
});

test("Polymorphic relationships work with a hasMany whose type is inferred", function() {
  User.reopen({
    contacts: DS.hasMany({ polymorphic: true })
  });

  expect(1);
  env.store.push('user', { id: 1, contacts: [ { id: 1, type: 'email' }, { id: 2, type: 'phone' } ] });
  env.store.push('email', { id: 1 });
  env.store.push('phone', { id: 2 });
  env.store.find('user', 1).then(async(function(user) {
    return user.get('contacts');
  })).then(async(function(contacts) {
    equal(contacts.get('length'), 2, "The contacts relationship is correctly set up");
  }));
});

test("A record can't be created from a polymorphic hasMany relationship", function() {
  env.store.push('user', { id: 1, messages: [] });

  env.store.find('user', 1).then(async(function(user) {
    return user.get('messages');
  })).then(async(function(messages) {
    expectAssertion(function() {
      messages.createRecord();
    }, /You cannot add 'message' records to this polymorphic relationship/);
  }));
});

test("Only records of the same type can be added to a monomorphic hasMany relationship", function() {
  expect(1);
  env.store.push('post', { id: 1, comments: [] });
  env.store.push('post', { id: 2 });

  Ember.RSVP.all([ env.store.find('post', 1), env.store.find('post', 2) ]).then(async(function(records) {
    expectAssertion(function() {
      records[0].get('comments').pushObject(records[1]);
    }, /You cannot add 'post' records to this relationship/);
  }));

});

test("Only records of the same base type can be added to a polymorphic hasMany relationship", function() {
  expect(2);
  env.store.push('user', { id: 1, messages: [] });
  env.store.push('user', { id: 2, messages: [] });
  env.store.push('post', { id: 1, comments: [] });
  env.store.push('comment', { id: 3 });

  var asyncRecords = Ember.RSVP.hash({
    user: env.store.find('user', 1),
    anotherUser: env.store.find('user', 2),
    post: env.store.find('post', 1),
    comment: env.store.find('comment', 3)
  });

  asyncRecords.then(async(function(records) {
    records.messages = records.user.get('messages');
    return Ember.RSVP.hash(records);
  })).then(async(function(records) {
    records.messages.pushObject(records.post);
    records.messages.pushObject(records.comment);
    equal(records.messages.get('length'), 2, "The messages are correctly added");

    expectAssertion(function() {
      records.messages.pushObject(records.anotherUser);
    }, /You cannot add 'user' records to this relationship/);
  }));
});

test("A record can be removed from a polymorphic association", function() {
  expect(3);

  env.store.push('user', { id: 1 , messages: [{id: 3, type: 'comment'}]});
  env.store.push('comment', { id: 3 });

  var asyncRecords = Ember.RSVP.hash({
    user: env.store.find('user', 1),
    comment: env.store.find('comment', 3)
  });

  asyncRecords.then(async(function(records) {
    records.messages = records.user.get('messages');
    return Ember.RSVP.hash(records);
  })).then(async(function(records) {
    equal(records.messages.get('length'), 1, "The user has 1 message");

    var removedObject = records.messages.popObject();

    equal(removedObject, records.comment, "The message is correctly removed");
    equal(records.messages.get('length'), 0, "The user does not have any messages");
  }));
});

test("When a record is created on the client, its hasMany arrays should be in a loaded state", function() {
  expect(3);

  var post;

  Ember.run(function() {
    post = env.store.createRecord('post');
  });

  ok(get(post, 'isLoaded'), "The post should have isLoaded flag");

  var comments = get(post, 'comments');

  equal(get(comments, 'length'), 0, "The comments should be an empty array");

  ok(get(comments, 'isLoaded'), "The comments should have isLoaded flag");

});

test("When a record is created on the client, its async hasMany arrays should be in a loaded state", function() {
  expect(4);

  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  var post;

  Ember.run(function() {
    post = env.store.createRecord('post');
  });

  ok(get(post, 'isLoaded'), "The post should have isLoaded flag");

  get(post, 'comments').then(function(comments) {
    ok(true, "Comments array successfully resolves");
    equal(get(comments, 'length'), 0, "The comments should be an empty array");
    ok(get(comments, 'isLoaded'), "The comments should have isLoaded flag");
  });

});

})();

(function() {
var Post, Comment, Message, User, store, env;

module('integration/relationships/inverse_relationships - Inverse Relationships');

test("When a record is added to a has-many relationship, the inverse belongsTo is determined automatically", function() {
  Post = DS.Model.extend({
    comments: DS.hasMany('comment')
  });

  Comment = DS.Model.extend({
    post: DS.belongsTo('post')
  });

  var env = setupStore({ post: Post, comment: Comment }),
      store = env.store;

  var comment = store.createRecord('comment');
  var post = store.createRecord('post');

  equal(comment.get('post'), null, "no post has been set on the comment");

  post.get('comments').pushObject(comment);
  equal(comment.get('post'), post, "post was set on the comment");
});

test("Inverse relationships can be explicitly nullable", function () {
  User = DS.Model.extend();

  Post = DS.Model.extend({
    lastParticipant: DS.belongsTo(User, { inverse: null }),
    participants: DS.hasMany(User, { inverse: 'posts' })
  });

  User.reopen({
    posts: DS.hasMany(Post, { inverse: 'participants' })
  });

  equal(User.inverseFor('posts').name, 'participants', 'User.posts inverse is Post.participants');
  equal(Post.inverseFor('lastParticipant'), null, 'Post.lastParticipant has no inverse');
  equal(Post.inverseFor('participants').name, 'posts', 'Post.participants inverse is User.posts');
});

test("When a record is added to a has-many relationship, the inverse belongsTo can be set explicitly", function() {
  Post = DS.Model.extend({
    comments: DS.hasMany('comment', { inverse: 'redPost' })
  });

  Comment = DS.Model.extend({
    onePost: DS.belongsTo('post'),
    twoPost: DS.belongsTo('post'),
    redPost: DS.belongsTo('post'),
    bluePost: DS.belongsTo('post')
  });

  var env = setupStore({ post: Post, comment: Comment }),
      store = env.store;

  var comment = store.createRecord('comment');
  var post = store.createRecord('post');

  equal(comment.get('onePost'), null, "onePost has not been set on the comment");
  equal(comment.get('twoPost'), null, "twoPost has not been set on the comment");
  equal(comment.get('redPost'), null, "redPost has not been set on the comment");
  equal(comment.get('bluePost'), null, "bluePost has not been set on the comment");

  post.get('comments').pushObject(comment);

  equal(comment.get('onePost'), null, "onePost has not been set on the comment");
  equal(comment.get('twoPost'), null, "twoPost has not been set on the comment");
  equal(comment.get('redPost'), post, "redPost has been set on the comment");
  equal(comment.get('bluePost'), null, "bluePost has not been set on the comment");
});

test("When a record's belongsTo relationship is set, it can specify the inverse hasMany to which the new child should be added", function() {
  Post = DS.Model.extend({
    meComments: DS.hasMany('comment'),
    youComments: DS.hasMany('comment'),
    everyoneWeKnowComments: DS.hasMany('comment')
  });

  Comment = DS.Model.extend({
    post: DS.belongsTo('post', { inverse: 'youComments' })
  });

  var env = setupStore({ post: Post, comment: Comment }),
      store = env.store;

  var comment = store.createRecord('comment');
  var post = store.createRecord('post');

  equal(post.get('meComments.length'), 0, "meComments has no posts");
  equal(post.get('youComments.length'), 0, "youComments has no posts");
  equal(post.get('everyoneWeKnowComments.length'), 0, "everyoneWeKnowComments has no posts");

  comment.set('post', post);

  equal(post.get('meComments.length'), 0, "meComments has no posts");
  equal(post.get('youComments.length'), 1, "youComments had the post added");
  equal(post.get('everyoneWeKnowComments.length'), 0, "everyoneWeKnowComments has no posts");
});

test("When a record is added to or removed from a polymorphic has-many relationship, the inverse belongsTo can be set explicitly", function() {
  User = DS.Model.extend({
    messages: DS.hasMany('message', {
      inverse: 'redUser',
      polymorphic: true
    })
  });

  Message = DS.Model.extend({
    oneUser: DS.belongsTo('user'),
    twoUser: DS.belongsTo('user'),
    redUser: DS.belongsTo('user'),
    blueUser: DS.belongsTo('user')
  });

  Post = Message.extend();

  var env = setupStore({ user: User, message: Message, post: Post }),
      store = env.store;

  var post = store.createRecord('post');
  var user = store.createRecord('user');

  equal(post.get('oneUser'), null, "oneUser has not been set on the user");
  equal(post.get('twoUser'), null, "twoUser has not been set on the user");
  equal(post.get('redUser'), null, "redUser has not been set on the user");
  equal(post.get('blueUser'), null, "blueUser has not been set on the user");

  user.get('messages').pushObject(post);

  equal(post.get('oneUser'), null, "oneUser has not been set on the user");
  equal(post.get('twoUser'), null, "twoUser has not been set on the user");
  equal(post.get('redUser'), user, "redUser has been set on the user");
  equal(post.get('blueUser'), null, "blueUser has not been set on the user");

  user.get('messages').popObject();

  equal(post.get('oneUser'), null, "oneUser has not been set on the user");
  equal(post.get('twoUser'), null, "twoUser has not been set on the user");
  equal(post.get('redUser'), null, "redUser has bot been set on the user");
  equal(post.get('blueUser'), null, "blueUser has not been set on the user");
});

test("When a record's belongsTo relationship is set, it can specify the inverse polymorphic hasMany to which the new child should be added or removed", function() {
  User = DS.Model.extend({
    meMessages: DS.hasMany('message', { polymorphic: true }),
    youMessages: DS.hasMany('message', { polymorphic: true }),
    everyoneWeKnowMessages: DS.hasMany('message', { polymorphic: true })
  });

  Message = DS.Model.extend({
    user: DS.belongsTo('user', { inverse: 'youMessages' })
  });

  Post = Message.extend();

  var env = setupStore({ user: User, message: Message, post: Post }),
      store = env.store;

  var user = store.createRecord('user');
  var post = store.createRecord('post');

  equal(user.get('meMessages.length'), 0, "meMessages has no posts");
  equal(user.get('youMessages.length'), 0, "youMessages has no posts");
  equal(user.get('everyoneWeKnowMessages.length'), 0, "everyoneWeKnowMessages has no posts");

  post.set('user', user);

  equal(user.get('meMessages.length'), 0, "meMessages has no posts");
  equal(user.get('youMessages.length'), 1, "youMessages had the post added");
  equal(user.get('everyoneWeKnowMessages.length'), 0, "everyoneWeKnowMessages has no posts");

  post.set('user', null);

  equal(user.get('meMessages.length'), 0, "meMessages has no posts");
  equal(user.get('youMessages.length'), 0, "youMessages has no posts");
  equal(user.get('everyoneWeKnowMessages.length'), 0, "everyoneWeKnowMessages has no posts");
});

test("When a record's polymorphic belongsTo relationship is set, it can specify the inverse hasMany to which the new child should be added", function() {
  Message = DS.Model.extend({
    meMessages: DS.hasMany('comment'),
    youMessages: DS.hasMany('comment'),
    everyoneWeKnowMessages: DS.hasMany('comment')
  });

  Post = Message.extend();

  Comment = Message.extend({
    message: DS.belongsTo('message', {
      polymorphic: true,
      inverse: 'youMessages'
    })
  });

  var env = setupStore({ comment: Comment, message: Message, post: Post }),
      store = env.store;

  var comment = store.createRecord('comment');
  var post = store.createRecord('post');

  equal(post.get('meMessages.length'), 0, "meMessages has no posts");
  equal(post.get('youMessages.length'), 0, "youMessages has no posts");
  equal(post.get('everyoneWeKnowMessages.length'), 0, "everyoneWeKnowMessages has no posts");

  comment.set('message', post);

  equal(post.get('meMessages.length'), 0, "meMessages has no posts");
  equal(post.get('youMessages.length'), 1, "youMessages had the post added");
  equal(post.get('everyoneWeKnowMessages.length'), 0, "everyoneWeKnowMessages has no posts");

  comment.set('message', null);

  equal(post.get('meMessages.length'), 0, "meMessages has no posts");
  equal(post.get('youMessages.length'), 0, "youMessages has no posts");
  equal(post.get('everyoneWeKnowMessages.length'), 0, "everyoneWeKnowMessages has no posts");
});

})();

(function() {
var get = Ember.get, set = Ember.set;
var Post, post, Comment, comment, env;

module("integration/serializer/json - JSONSerializer", {
  setup: function() {
    Post = DS.Model.extend({
      title: DS.attr('string')
    });
    Comment = DS.Model.extend({
      body: DS.attr('string'),
      post: DS.belongsTo('post')
    });
    env = setupStore({
      post:     Post,
      comment:  Comment
    });
    env.store.modelFor('post');
    env.store.modelFor('comment');
  },

  teardown: function() {
    env.store.destroy();
  }
});

test("serializeAttribute", function() {
  post = env.store.createRecord("post", { title: "Rails is omakase"});
  var json = {};

  env.serializer.serializeAttribute(post, json, "title", {type: "string"});

  deepEqual(json, {
    title: "Rails is omakase"
  });
});

test("serializeAttribute respects keyForAttribute", function() {
  env.container.register('serializer:post', DS.JSONSerializer.extend({
    keyForAttribute: function(key) {
      return key.toUpperCase();
    }
  }));

  post = env.store.createRecord("post", { title: "Rails is omakase"});
  var json = {};

  env.container.lookup("serializer:post").serializeAttribute(post, json, "title", {type: "string"});


  deepEqual(json, {
    TITLE: "Rails is omakase"
  });
});

test("serializeBelongsTo", function() {
  post = env.store.createRecord(Post, { title: "Rails is omakase", id: "1"});
  comment = env.store.createRecord(Comment, { body: "Omakase is delicious", post: post});
  var json = {};

  env.serializer.serializeBelongsTo(comment, json, {key: "post", options: {}});

  deepEqual(json, {
    post: "1"
  });

  json = {};

  set(comment, 'post', null);

  env.serializer.serializeBelongsTo(comment, json, {key: "post", options: {}});

  deepEqual(json, {
    post: null
  }, "Can set a belongsTo to a null value");

});

test("serializeBelongsTo respects keyForRelationship", function() {
  env.container.register('serializer:post', DS.JSONSerializer.extend({
    keyForRelationship: function(key, type) {
      return key.toUpperCase();
    }
  }));
  post = env.store.createRecord(Post, { title: "Rails is omakase", id: "1"});
  comment = env.store.createRecord(Comment, { body: "Omakase is delicious", post: post});
  var json = {};

  env.container.lookup("serializer:post").serializeBelongsTo(comment, json, {key: "post", options: {}});

  deepEqual(json, {
    POST: "1"
  });
});

test("serializePolymorphicType", function() {
  env.container.register('serializer:comment', DS.JSONSerializer.extend({
    serializePolymorphicType: function(record, json, relationship) {
      var key = relationship.key,
          belongsTo = get(record, key);
      json[relationship.key + "TYPE"] = belongsTo.constructor.typeKey;
    }
  }));

  post = env.store.createRecord(Post, { title: "Rails is omakase", id: "1"});
  comment = env.store.createRecord(Comment, { body: "Omakase is delicious", post: post});
  var json = {};

  env.container.lookup("serializer:comment").serializeBelongsTo(comment, json, {key: "post", options: { polymorphic: true}});

  deepEqual(json, {
    post: "1",
    postTYPE: "post"
  });
});

})();

(function() {
var get = Ember.get, set = Ember.set;
var HomePlanet, league, SuperVillain, superVillain, EvilMinion, YellowMinion, DoomsdayDevice, Comment, env;

module("integration/serializer/rest - RESTSerializer", {
  setup: function() {
    HomePlanet = DS.Model.extend({
      name:          DS.attr('string'),
      superVillains: DS.hasMany('superVillain')
    });
    SuperVillain = DS.Model.extend({
      firstName:     DS.attr('string'),
      lastName:      DS.attr('string'),
      homePlanet:    DS.belongsTo("homePlanet"),
      evilMinions:   DS.hasMany("evilMinion")
    });
    EvilMinion = DS.Model.extend({
      superVillain: DS.belongsTo('superVillain'),
      name:         DS.attr('string')
    });
    YellowMinion = EvilMinion.extend();
    DoomsdayDevice = DS.Model.extend({
      name:         DS.attr('string'),
      evilMinion:   DS.belongsTo('evilMinion', {polymorphic: true})
    });
    Comment = DS.Model.extend({
      body: DS.attr('string'),
      root: DS.attr('boolean'),
      children: DS.hasMany('comment')
    });
    env = setupStore({
      superVillain:   SuperVillain,
      homePlanet:     HomePlanet,
      evilMinion:     EvilMinion,
      yellowMinion:   YellowMinion,
      doomsdayDevice: DoomsdayDevice,
      comment:        Comment
    });
    env.store.modelFor('superVillain');
    env.store.modelFor('homePlanet');
    env.store.modelFor('evilMinion');
    env.store.modelFor('yellowMinion');
    env.store.modelFor('doomsdayDevice');
    env.store.modelFor('comment');
  },

  teardown: function() {
    env.store.destroy();
  }
});

test("extractArray with custom typeForRoot", function() {
  env.restSerializer.typeForRoot = function(root) {
    var camelized = Ember.String.camelize(root);
    return Ember.String.singularize(camelized);
  };

  var json_hash = {
    home_planets: [{id: "1", name: "Umber", superVillains: [1]}],
    super_villains: [{id: "1", firstName: "Tom", lastName: "Dale", homePlanet: "1"}]
  };

  var array = env.restSerializer.extractArray(env.store, HomePlanet, json_hash);

  deepEqual(array, [{
    "id": "1",
    "name": "Umber",
    "superVillains": [1]
  }]);

  env.store.find("superVillain", 1).then(async(function(minion){
    equal(minion.get('firstName'), "Tom");
  }));
});

test("extractArray failure with custom typeForRoot", function() {
  env.restSerializer.typeForRoot = function(root) {
    //should be camelized too, but, whoops, the developer forgot!
    return Ember.String.singularize(root);
  };

  var json_hash = {
    home_planets: [{id: "1", name: "Umber", superVillains: [1]}],
    super_villains: [{id: "1", firstName: "Tom", lastName: "Dale", homePlanet: "1"}]
  };

  raises(function(){
    env.restSerializer.extractArray(env.store, HomePlanet, json_hash);
  }, "No model was found for 'home_planets'",
  "raised error message expected to contain \"No model was found for 'home_planets'\"");
});

test("serialize polymorphicType", function() {
  var tom = env.store.createRecord(YellowMinion,   {name: "Alex", id: "124"});
  var ray = env.store.createRecord(DoomsdayDevice, {evilMinion: tom, name: "DeathRay"});

  var json = env.restSerializer.serialize(ray);

  deepEqual(json, {
    name:  "DeathRay",
    evilMinionType: "yellowMinion",
    evilMinion: "124"
  });
});

test("extractArray can load secondary records of the same type without affecting the query count", function() {
  var json_hash = {
    comments: [{id: "1", body: "Parent Comment", root: true, children: [2, 3]}],
    _comments: [
      { id: "2", body: "Child Comment 1", root: false },
      { id: "3", body: "Child Comment 2", root: false }
    ]
  };

  var array = env.restSerializer.extractArray(env.store, Comment, json_hash);

  deepEqual(array, [{
    "id": "1",
    "body": "Parent Comment",
    "root": true,
    "children": [2, 3]
  }]);

  equal(array.length, 1, "The query count is unaffected");

  equal(env.store.recordForId("comment", "2").get("body"), "Child Comment 1", "Secondary records are in the store");
  equal(env.store.recordForId("comment", "3").get("body"), "Child Comment 2", "Secondary records are in the store");
});

test("extractSingle loads secondary records with correct serializer", function() {
  var superVillainNormalizeCount = 0;

  env.container.register('serializer:superVillain', DS.RESTSerializer.extend({
    normalize: function() {
      superVillainNormalizeCount++;
      return this._super.apply(this, arguments);
    }
  }));

  var json_hash = {
    evilMinion: {id: "1", name: "Tom Dale", superVillain: 1},
    superVillains: [{id: "1", firstName: "Yehuda", lastName: "Katz", homePlanet: "1"}]
  };

  var array = env.restSerializer.extractSingle(env.store, EvilMinion, json_hash);

  equal(superVillainNormalizeCount, 1, "superVillain is normalized once");
});

test("extractArray loads secondary records with correct serializer", function() {
  var superVillainNormalizeCount = 0;

  env.container.register('serializer:superVillain', DS.RESTSerializer.extend({
    normalize: function() {
      superVillainNormalizeCount++;
      return this._super.apply(this, arguments);
    }
  }));

  var json_hash = {
    evilMinions: [{id: "1", name: "Tom Dale", superVillain: 1}],
    superVillains: [{id: "1", firstName: "Yehuda", lastName: "Katz", homePlanet: "1"}]
  };

  var array = env.restSerializer.extractArray(env.store, EvilMinion, json_hash);

  equal(superVillainNormalizeCount, 1, "superVillain is normalized once");
});

test('normalizeHash normalizes specific parts of the payload', function(){
  env.container.register('serializer:application', DS.RESTSerializer.extend({
    normalizeHash: {
      homePlanets: function(hash) {
        hash.id = hash._id;
        delete hash._id;
        return hash;
      }
    }
  }));

  var jsonHash = { homePlanets: [{_id: "1", name: "Umber", superVillains: [1]}] };

  var array = env.restSerializer.extractArray(env.store, HomePlanet, jsonHash);

  deepEqual(array, [{
    "id": "1",
    "name": "Umber",
    "superVillains": [1]
  }]);
});

test('normalizeHash works with transforms', function(){
  env.container.register('serializer:application', DS.RESTSerializer.extend({
    normalizeHash: {
      evilMinions: function(hash) {
        hash.condition = hash._condition;
        delete hash._condition;
        return hash;
      }
    }
  }));

  env.container.register('transform:condition', DS.Transform.extend({
    deserialize: function(serialized) {
      if (serialized === 1) {
        return "healing";
      } else {
        return "unknown";
      }
    },
    serialize: function(deserialized) {
      if (deserialized === "healing") {
        return 1;
      } else {
        return 2;
      }
    }
  }));

  EvilMinion.reopen({ condition: DS.attr('condition') });

  var jsonHash = {
    evilMinions: [{id: "1", name: "Tom Dale", superVillain: 1, _condition: 1}]
  };

  var array = env.restSerializer.extractArray(env.store, EvilMinion, jsonHash);

  equal(array[0].condition, "healing");
});

test('normalize should allow for different levels of normalization', function(){
  env.container.register('serializer:application', DS.RESTSerializer.extend({
    attrs: {
      superVillain: 'is_super_villain'
    },
    keyForAttribute: function(attr) {
      return Ember.String.decamelize(attr);
    }
  }));

  var jsonHash = {
    evilMinions: [{id: "1", name: "Tom Dale", is_super_villain: 1}]
  };

  var array = env.restSerializer.extractArray(env.store, EvilMinion, jsonHash);

  equal(array[0].superVillain, 1);
});

})();

(function() {
var get = Ember.get, set = Ember.set;

var store;

var TestAdapter = DS.Adapter.extend();

module("Debug", {
  setup: function() {
    store = DS.Store.create({
      adapter: TestAdapter.extend()
    });
  },

  teardown: function() {
    store.destroy();
    store = null;
  }
});

test("_debugInfo groups the attributes and relationships correctly", function() {
  var MaritalStatus = DS.Model.extend({
    name: DS.attr('string')
  });

  var Post = DS.Model.extend({
    title: DS.attr('string')
  });

  var User = DS.Model.extend({
    name: DS.attr('string'),
    isDrugAddict: DS.attr('boolean'),
    maritalStatus: DS.belongsTo(MaritalStatus),
    posts: DS.hasMany(Post)
  });

  var record = store.createRecord(User);

  var propertyInfo = record._debugInfo().propertyInfo;

  equal(propertyInfo.groups.length, 4);
  deepEqual(propertyInfo.groups[0].properties, ['id', 'name', 'isDrugAddict']);
  deepEqual(propertyInfo.groups[1].properties, ['maritalStatus']);
  deepEqual(propertyInfo.groups[2].properties, ['posts']);
});

})();

(function() {
var get = Ember.get, set = Ember.set;

module("unit/model/lifecycle_callbacks - Lifecycle Callbacks");

test("a record receives a didLoad callback when it has finished loading", function() {
  var Person = DS.Model.extend({
    name: DS.attr(),
    didLoad: function() {
      ok("The didLoad callback was called");
    }
  });

  var adapter = DS.Adapter.extend({
    find: function(store, type, id) {
      return Ember.RSVP.resolve({ id: 1, name: "Foo" });
    }
  });

  var store = createStore({
    adapter: adapter
  });

  store.find(Person, 1).then(async(function(person) {
    equal(person.get('id'), "1", "The person's ID is available");
    equal(person.get('name'), "Foo", "The person's properties are available");
  }));
});

test("a record receives a didUpdate callback when it has finished updating", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),

    didUpdate: function() {
      callCount++;
      equal(get(this, 'isSaving'), false, "record should be saving");
      equal(get(this, 'isDirty'), false, "record should not be dirty");
    }
  });

  var adapter = DS.Adapter.extend({
    find: function(store, type, id) {
      return Ember.RSVP.resolve({ id: 1, name: "Foo" });
    },

    updateRecord: function(store, type, record) {
      equal(callCount, 0, "didUpdate callback was not called until didSaveRecord is called");

      return Ember.RSVP.resolve();
    }
  });

  var store = createStore({
    adapter: adapter
  });

  var asyncPerson = store.find(Person, 1);
  equal(callCount, 0, "precond - didUpdate callback was not called yet");

  asyncPerson.then(async(function(person) {
    person.set('bar', "Bar");
    return person.save();
  })).then(async(function() {
    equal(callCount, 1, "didUpdate called after update");
  }));
});

test("a record receives a didCreate callback when it has finished updating", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    didCreate: function() {
      callCount++;
      equal(get(this, 'isSaving'), false, "record should not be saving");
      equal(get(this, 'isDirty'), false, "record should not be dirty");
    }
  });

  var adapter = DS.Adapter.extend({
    createRecord: function(store, type, record) {
      equal(callCount, 0, "didCreate callback was not called until didSaveRecord is called");

      return Ember.RSVP.resolve();
    }
  });

  var store = createStore({
    adapter: adapter
  });

  equal(callCount, 0, "precond - didCreate callback was not called yet");

  var person = store.createRecord(Person, { id: 69, name: "Newt Gingrich" });

  person.save().then(async(function() {
    equal(callCount, 1, "didCreate called after commit");
  }));
});

test("a record receives a didDelete callback when it has finished deleting", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),

    didDelete: function() {
      callCount++;

      equal(get(this, 'isSaving'), false, "record should not be saving");
      equal(get(this, 'isDirty'), false, "record should not be dirty");
    }
  });

  var adapter = DS.Adapter.extend({
    find: function(store, type, id) {
      return Ember.RSVP.resolve({ id: 1, name: "Foo" });
    },

    deleteRecord: function(store, type, record) {
      equal(callCount, 0, "didDelete callback was not called until didSaveRecord is called");

      return Ember.RSVP.resolve();
    }
  });

  var store = createStore({
    adapter: adapter
  });

  var asyncPerson = store.find(Person, 1);
  equal(callCount, 0, "precond - didDelete callback was not called yet");

  asyncPerson.then(async(function(person) {
    person.deleteRecord();
    return person.save();
  })).then(async(function() {
    equal(callCount, 1, "didDelete called after delete");
  }));
});

test("a record receives a becameInvalid callback when it became invalid", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),

    becameInvalid: function() {
      callCount++;

      equal(get(this, 'isSaving'), false, "record should not be saving");
      equal(get(this, 'isDirty'), true, "record should be dirty");
    }
  });

  var adapter = DS.Adapter.extend({
    find: function(store, type, id) {
      return Ember.RSVP.resolve({ id: 1, name: "Foo" });
    },

    updateRecord: function(store, type, record) {
      equal(callCount, 0, "becameInvalid callback was not called untill recordWasInvalid is called");

      return Ember.RSVP.reject(new DS.InvalidError({ bar: 'error' }));
    }
  });

  var store = createStore({
    adapter: adapter
  });

  var asyncPerson = store.find(Person, 1);
  equal(callCount, 0, "precond - becameInvalid callback was not called yet");

  // Make sure that the error handler has a chance to attach before
  // save fails.
  Ember.run(function() {
    asyncPerson.then(async(function(person) {
      person.set('bar', "Bar");
      return person.save();
    })).then(null, async(function() {
      equal(callCount, 1, "becameInvalid called after invalidating");
    }));
  });
});

test("an ID of 0 is allowed", function() {
  var store = createStore();

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store.push(Person, { id: 0, name: "Tom Dale" });
  equal(store.all(Person).objectAt(0).get('name'), "Tom Dale", "found record with id 0");
});

})();

(function() {
var Person;

module("unit/model/merge - Merging", {
  setup: function() {
    Person = DS.Model.extend({
      name: DS.attr(),
      city: DS.attr()
    });
  },

  teardown: function() {

  }
});

test("When a record is in flight, changes can be made", function() {
  var adapter = DS.Adapter.extend({
    createRecord: function(store, type, record) {
      return Ember.RSVP.resolve({ id: 1, name: "Tom Dale" });
    }
  });

  var store = createStore({ adapter: adapter });

  var person = store.createRecord(Person, { name: "Tom Dale" });

  // Make sure saving isn't resolved synchronously
  Ember.run(function() {
    var promise = person.save();

    equal(person.get('name'), "Tom Dale");

    person.set('name', "Thomas Dale");

    promise.then(function(person) {
      equal(person.get('isDirty'), true, "The person is still dirty");
      equal(person.get('name'), "Thomas Dale", "The changes made still apply");
    });
  });
});

test("When a record is in flight, pushes are applied underneath the in flight changes", function() {
  var adapter = DS.Adapter.extend({
    updateRecord: function(store, type, record) {
      return Ember.RSVP.resolve({ id: 1, name: "Senor Thomas Dale, Esq.", city: "Portland" });
    }
  });

  var store = createStore({ adapter: adapter });

  var person = store.push(Person, { id: 1, name: "Tom" });
  person.set('name', "Thomas Dale");

  // Make sure saving isn't resolved synchronously
  Ember.run(function() {
    var promise = person.save();

    equal(person.get('name'), "Thomas Dale");

    person.set('name', "Tomasz Dale");

    store.push(Person, { id: 1, name: "Tommy Dale", city: "PDX" });

    equal(person.get('name'), "Tomasz Dale", "the local changes applied on top");
    equal(person.get('city'), "PDX", "the pushed change is available");

    promise.then(function(person) {
      equal(person.get('isDirty'), true, "The person is still dirty");
      equal(person.get('name'), "Tomasz Dale", "The local changes apply");
      equal(person.get('city'), "Portland", "The updates from the server apply on top of the previous pushes");
    });
  });
});

test("When a record is dirty, pushes are overridden by local changes", function() {
  var store = createStore({ adapter: DS.Adapter });

  var person = store.push(Person, { id: 1, name: "Tom Dale", city: "San Francisco" });

  person.set('name', "Tomasz Dale");

  equal(person.get('isDirty'), true, "the person is currently dirty");
  equal(person.get('name'), "Tomasz Dale", "the update was effective");
  equal(person.get('city'), "San Francisco", "the original data applies");

  store.push(Person, { id: 1, name: "Thomas Dale", city: "Portland" });

  equal(person.get('isDirty'), true, "the local changes are reapplied");
  equal(person.get('name'), "Tomasz Dale", "the local changes are reapplied");
  equal(person.get('city'), "Portland", "if there are no local changes, the new data applied");
});

test("A record with no changes can still be saved", function() {
  var adapter = DS.Adapter.extend({
    updateRecord: function(store, type, record) {
      return Ember.RSVP.resolve({ id: 1, name: "Thomas Dale" });
    }
  });

  var store = createStore({ adapter: adapter });

  var person = store.push(Person, { id: 1, name: "Tom Dale" });

  person.save().then(async(function() {
    equal(person.get('name'), "Thomas Dale", "the updates occurred");
  }));
});

test("A dirty record can be reloaded", function() {
  var adapter = DS.Adapter.extend({
    find: function(store, type, id) {
      return Ember.RSVP.resolve({ id: 1, name: "Thomas Dale", city: "Portland" });
    }
  });

  var store = createStore({ adapter: adapter });

  var person = store.push(Person, { id: 1, name: "Tom Dale" });

  person.set('name', "Tomasz Dale");

  person.reload().then(async(function() {
    equal(person.get('isDirty'), true, "the person is dirty");
    equal(person.get('name'), "Tomasz Dale", "the local changes remain");
    equal(person.get('city'), "Portland", "the new changes apply");
  }));
});

})();

(function() {
/*global Tag App*/

var get = Ember.get, set = Ember.set;

module("unit/model/relationships - DS.Model");

test("exposes a hash of the relationships on a model", function() {
  var Occupation = DS.Model.extend();

  var Person = DS.Model.extend({
    occupations: DS.hasMany(Occupation)
  });

  Person.reopen({
    people: DS.hasMany(Person),
    parent: DS.belongsTo(Person)
  });

  var relationships = get(Person, 'relationships');
  deepEqual(relationships.get(Person), [
    { name: "people", kind: "hasMany" },
    { name: "parent", kind: "belongsTo" }
  ]);

  deepEqual(relationships.get(Occupation), [
    { name: "occupations", kind: "hasMany" }
  ]);
});

var env;
module("unit/model/relationships - DS.hasMany", {
  setup: function() {
    env = setupStore();
  }
});

test("hasMany handles pre-loaded relationships", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  var Pet = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag'),
    pets: DS.hasMany('pet')
  });

  env.container.register('model:tag', Tag);
  env.container.register('model:pet', Pet);
  env.container.register('model:person', Person);

  env.adapter.find = function(store, type, id) {
    if (type === Tag && id === '12') {
      return Ember.RSVP.resolve({ id: 12, name: "oohlala" });
    } else {
      ok(false, "find() should not be called with these values");
    }
  };

  var store = env.store;

  store.pushMany('tag', [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }]);
  store.pushMany('pet', [{ id: 4, name: "fluffy" }, { id: 7, name: "snowy" }, { id: 12, name: "cerberus" }]);
  store.push('person', { id: 1, name: "Tom Dale", tags: [5] });
  store.push('person', { id: 2, name: "Yehuda Katz", tags: [12] });

  var wycats;

  store.find('person', 1).then(async(function(person) {
    equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

    var tags = get(person, 'tags');
    equal(get(tags, 'length'), 1, "the list of tags should have the correct length");
    equal(get(tags.objectAt(0), 'name'), "friendly", "the first tag should be a Tag");

    store.push('person', { id: 1, name: "Tom Dale", tags: [5, 2] });
    equal(tags, get(person, 'tags'), "a relationship returns the same object every time");
    equal(get(get(person, 'tags'), 'length'), 2, "the length is updated after new data is loaded");

    strictEqual(get(person, 'tags').objectAt(0), get(person, 'tags').objectAt(0), "the returned object is always the same");
    asyncEqual(get(person, 'tags').objectAt(0), store.find(Tag, 5), "relationship objects are the same as objects retrieved directly");

    store.push('person', { id: 3, name: "KSelden" });

    return store.find('person', 3);
  })).then(async(function(kselden) {
    equal(get(get(kselden, 'tags'), 'length'), 0, "a relationship that has not been supplied returns an empty array");

    store.push('person', { id: 4, name: "Cyvid Hamluck", pets: [4] });
    return store.find('person', 4);
  })).then(async(function(cyvid) {
    equal(get(cyvid, 'name'), "Cyvid Hamluck", "precond - retrieves person record from store");

    var pets = get(cyvid, 'pets');
    equal(get(pets, 'length'), 1, "the list of pets should have the correct length");
    equal(get(pets.objectAt(0), 'name'), "fluffy", "the first pet should be correct");

    store.push(Person, { id: 4, name: "Cyvid Hamluck", pets: [4, 12] });
    equal(pets, get(cyvid, 'pets'), "a relationship returns the same object every time");
    equal(get(get(cyvid, 'pets'), 'length'), 2, "the length is updated after new data is loaded");
  }));
});

test("hasMany lazily loads async relationships", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  var Pet = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: true }),
    pets: DS.hasMany('pet')
  });

  env.container.register('model:tag', Tag);
  env.container.register('model:pet', Pet);
  env.container.register('model:person', Person);

  env.adapter.find = function(store, type, id) {
    if (type === Tag && id === '12') {
      return Ember.RSVP.resolve({ id: 12, name: "oohlala" });
    } else {
      ok(false, "find() should not be called with these values");
    }
  };

  var store = env.store;

  store.pushMany('tag', [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }]);
  store.pushMany('pet', [{ id: 4, name: "fluffy" }, { id: 7, name: "snowy" }, { id: 12, name: "cerberus" }]);
  store.push('person', { id: 1, name: "Tom Dale", tags: [5] });
  store.push('person', { id: 2, name: "Yehuda Katz", tags: [12] });

  var wycats;

  store.find('person', 2).then(async(function(person) {
    wycats = person;

    equal(get(wycats, 'name'), "Yehuda Katz", "precond - retrieves person record from store");

    return Ember.RSVP.hash({
      wycats: wycats,
      tags: wycats.get('tags')
    });
  })).then(async(function(records) {
    equal(get(records.tags, 'length'), 1, "the list of tags should have the correct length");
    equal(get(records.tags.objectAt(0), 'name'), "oohlala", "the first tag should be a Tag");

    strictEqual(records.tags.objectAt(0), records.tags.objectAt(0), "the returned object is always the same");
    asyncEqual(records.tags.objectAt(0), store.find(Tag, 12), "relationship objects are the same as objects retrieved directly");

    return get(wycats, 'tags');
  })).then(async(function(tags) {
    var newTag = store.createRecord(Tag);
    tags.pushObject(newTag);
  }));
});

test("should be able to retrieve the type for a hasMany relationship from its metadata", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag)
  });

  equal(Person.typeForRelationship('tags'), Tag, "returns the relationship type");
});

test("should be able to retrieve the type for a hasMany relationship specified using a string from its metadata", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag')
  });

  var env = setupStore({
    tag: Tag,
    person: Person
  });

  equal(env.store.modelFor('person').typeForRelationship('tags'), Tag, "returns the relationship type");
});

test("should be able to retrieve the type for a belongsTo relationship from its metadata", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.belongsTo('tag')
  });

  var env = setupStore({
    tag: Tag,
    person: Person
  });

  equal(env.store.modelFor('person').typeForRelationship('tags'), Tag, "returns the relationship type");
});

test("should be able to retrieve the type for a belongsTo relationship specified using a string from its metadata", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.belongsTo('tag')
  });

  var env = setupStore({
    tag: Tag,
    person: Person
  });

  equal(env.store.modelFor('person').typeForRelationship('tags'), Tag, "returns the relationship type");
});

test("relationships work when declared with a string path", function() {
  window.App = {};

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag')
  });

  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var env = setupStore({
    person: Person,
    tag: Tag
  });

  env.store.pushMany('tag', [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);
  env.store.push('person', { id: 1, name: "Tom Dale", tags: [5, 2] });

  env.store.find('person', 1).then(async(function(person) {
    equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");
    equal(get(person, 'tags.length'), 2, "the list of tags should have the correct length");
  }));
});

test("hasMany relationships work when the data hash has not been loaded", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  Tag.toString = function() { return "Tag"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: true })
  });

  Person.toString = function() { return "Person"; };

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  env.adapter.findMany = function(store, type, ids) {
    equal(type, Tag, "type should be Tag");
    deepEqual(ids, ['5', '2'], "ids should be 5 and 2");

    return Ember.RSVP.resolve([{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }]);
  };

  env.adapter.find = function(store, type, id) {
    equal(type, Person, "type should be Person");
    equal(id, 1, "id should be 1");

    return Ember.RSVP.resolve({ id: 1, name: "Tom Dale", tags: [5, 2] });
  };

  store.find('person', 1).then(async(function(person) {
    equal(get(person, 'name'), "Tom Dale", "The person is now populated");

    return person.get('tags');
  })).then(async(function(tags) {
    equal(get(tags, 'length'), 2, "the tags object still exists");
    equal(get(tags.objectAt(0), 'name'), "friendly", "Tom Dale is now friendly");
    equal(get(tags.objectAt(0), 'isLoaded'), true, "Tom Dale is now loaded");
  }));
});

test("it is possible to add a new item to a relationship", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.belongsTo('person')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag')
  });

  var env = setupStore({
    tag: Tag,
    person: Person
  });

  var store = env.store;

  store.push('person', { id: 1, name: "Tom Dale", tags: [ 1 ] });
  store.push('tag', { id: 1, name: "ember" });

  store.find(Person, 1).then(async(function(person) {
    var tag = get(person, 'tags').objectAt(0);

    equal(get(tag, 'name'), "ember", "precond - relationships work");

    tag = store.createRecord(Tag, { name: "js" });
    get(person, 'tags').pushObject(tag);

    equal(get(person, 'tags').objectAt(1), tag, "newly added relationship works");
  }));
});

test("it is possible to remove an item from a relationship", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag')
  });

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  store.push('person', { id: 1, name: "Tom Dale", tags: [ 1 ] });
  store.push('tag', { id: 1, name: "ember" });

  store.find('person', 1).then(async(function(person) {
    var tag = get(person, 'tags').objectAt(0);

    equal(get(tag, 'name'), "ember", "precond - relationships work");

    get(person, 'tags').removeObject(tag);

    equal(get(person, 'tags.length'), 0, "object is removed from the relationship");
  }));
});

test("it is possible to add an item to a relationship, remove it, then add it again", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag')
  });

  Tag.toString = function() { return "Tag"; };
  Person.toString = function() { return "Person"; };

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  var person = store.createRecord('person');
  var tag1 = store.createRecord('tag');
  var tag2 = store.createRecord('tag');
  var tag3 = store.createRecord('tag');

  var tags = get(person, 'tags');

  tags.pushObjects([tag1, tag2, tag3]);
  tags.removeObject(tag2);
  equal(tags.objectAt(0), tag1);
  equal(tags.objectAt(1), tag3);
  equal(get(person, 'tags.length'), 2, "object is removed from the relationship");

  tags.insertAt(0, tag2);
  equal(get(person, 'tags.length'), 3, "object is added back to the relationship");
  equal(tags.objectAt(0), tag2);
  equal(tags.objectAt(1), tag1);
  equal(tags.objectAt(2), tag3);
});

module("unit/model/relationships - RecordArray");

test("updating the content of a RecordArray updates its content", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var env = setupStore({ tag: Tag }),
      store = env.store;

  var records = store.pushMany('tag', [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);

  var tags = DS.RecordArray.create({ content: Ember.A(records.slice(0, 2)), store: store, type: Tag });

  var tag = tags.objectAt(0);
  equal(get(tag, 'name'), "friendly", "precond - we're working with the right tags");

  set(tags, 'content', Ember.A(records.slice(1, 3)));
  tag = tags.objectAt(0);
  equal(get(tag, 'name'), "smarmy", "the lookup was updated");
});

test("can create child record from a hasMany relationship", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag')
  });

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  store.push('person', { id: 1, name: "Tom Dale"});

  store.find('person', 1).then(async(function(person) {
    person.get("tags").createRecord({ name: "cool" });

    equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");
    equal(get(person, 'tags.length'), 1, "tag is added to the parent record");
    equal(get(person, 'tags').objectAt(0).get("name"), "cool", "tag values are passed along");
  }));
});

module("unit/model/relationships - DS.belongsTo");

test("belongsTo lazily loads relationships as needed", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person')
  });
  Tag.toString = function() { return "Tag"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag')
  });
  Person.toString = function() { return "Person"; };

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  store.pushMany('tag', [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);
  store.push('person', { id: 1, name: "Tom Dale", tag: 5 });

  store.find('person', 1).then(async(function(person) {
    equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

    equal(get(person, 'tag') instanceof Tag, true, "the tag property should return a tag");
    equal(get(person, 'tag.name'), "friendly", "the tag shuld have name");

    strictEqual(get(person, 'tag'), get(person, 'tag'), "the returned object is always the same");
    asyncEqual(get(person, 'tag'), store.find('tag', 5), "relationship object is the same as object retrieved directly");
  }));
});

test("async belongsTo relationships work when the data hash has not been loaded", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: true })
  });

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  env.adapter.find = function(store, type, id) {
    if (type === Person) {
      equal(id, 1, "id should be 1");

      return Ember.RSVP.resolve({ id: 1, name: "Tom Dale", tag: 2 });
    } else if (type === Tag) {
      equal(id, 2, "id should be 2");

      return Ember.RSVP.resolve({ id: 2, name: "friendly" });
    }
  };

  store.find('person', 1).then(async(function(person) {
    equal(get(person, 'name'), "Tom Dale", "The person is now populated");

    return get(person, 'tag');
  })).then(async(function(tag) {
    equal(get(tag, 'name'), "friendly", "Tom Dale is now friendly");
    equal(get(tag, 'isLoaded'), true, "Tom Dale is now loaded");
  }));
});

test("async belongsTo relationships work when the data hash has already been loaded", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: true })
  });

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

    store.push('tag', { id: 2, name: "friendly"});
    store.push('person', { id: 1, name: "Tom Dale", tag: 2});

    store.find('person', 1).then(async(function(person) {
        equal(get(person, 'name'), "Tom Dale", "The person is now populated");
        return get(person, 'tag');
    })).then(async(function(tag) {
        equal(get(tag, 'name'), "friendly", "Tom Dale is now friendly");
        equal(get(tag, 'isLoaded'), true, "Tom Dale is now loaded");
  }));
});

test("calling createRecord and passing in an undefined value for a relationship should be treated as if null", function () {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag')
  });

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  store.createRecord('person', {id: 1, tag: undefined});

  store.find(Person, 1).then(async(function(person) {
    strictEqual(person.get('tag'), null, "undefined values should return null relationships");
  }));
});

test("findMany is passed the owner record for adapters when some of the object graph is already loaded", function() {
  var Occupation = DS.Model.extend({
    description: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  Occupation.toString = function() { return "Occupation"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    occupations: DS.hasMany('occupation', { async: true })
  });

  Person.toString = function() { return "Person"; };

  var env = setupStore({ occupation: Occupation, person: Person }),
      store = env.store;

  env.adapter.findMany = function(store, type, ids, owner) {
    equal(type, Occupation, "type should be Occupation");
    deepEqual(ids, ['5', '2'], "ids should be 5 and 2");
    equal(get(owner, 'id'), 1, "the owner record id should be 1");

    return Ember.RSVP.resolve([{ id: 5, description: "fifth" }, { id: 2, description: "second" }]);
  };

  store.push('person', { id: 1, name: "Tom Dale", occupations: [5, 2] });

  store.find('person', 1).then(async(function(person) {
    equal(get(person, 'isLoaded'), true, "isLoaded should be true");
    equal(get(person, 'name'), "Tom Dale", "the person is still Tom Dale");

    return get(person, 'occupations');
  })).then(async(function(occupations) {
    equal(get(occupations, 'length'), 2, "the list of occupations should have the correct length");

    equal(get(occupations.objectAt(0), 'description'), "fifth", "the occupation is the fifth");
    equal(get(occupations.objectAt(0), 'isLoaded'), true, "the occupation is now loaded");
  }));
});

test("findMany is passed the owner record for adapters when none of the object graph is loaded", function() {
  var Occupation = DS.Model.extend({
    description: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  Occupation.toString = function() { return "Occupation"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    occupations: DS.hasMany('occupation', { async: true })
  });

  Person.toString = function() { return "Person"; };

  var env = setupStore({ occupation: Occupation, person: Person }),
      store = env.store;

  env.adapter.findMany = function(store, type, ids, owner) {
    equal(type, Occupation, "type should be Occupation");
    deepEqual(ids, ['5', '2'], "ids should be 5 and 2");
    equal(get(owner, 'id'), 1, "the owner record id should be 1");

    return Ember.RSVP.resolve([{ id: 5, description: "fifth" }, { id: 2, description: "second" }]);
  };

  env.adapter.find = function(store, type, id) {
    equal(type, Person, "type should be Person");
    equal(id, 1, "id should be 1");

    return Ember.RSVP.resolve({ id: 1, name: "Tom Dale", occupations: [5, 2] });
  };

  store.find('person', 1).then(async(function(person) {
    equal(get(person, 'name'), "Tom Dale", "The person is now populated");

    return get(person, 'occupations');
  })).then(async(function(occupations) {
    equal(get(occupations, 'length'), 2, "the occupation objects still exist");
    equal(get(occupations.objectAt(0), 'description'), "fifth", "the occupation is the fifth");
    equal(get(occupations.objectAt(0), 'isLoaded'), true, "the occupation is now loaded");
  }));
});

test("belongsTo supports relationships to models with id 0", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person')
  });
  Tag.toString = function() { return "Tag"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag')
  });
  Person.toString = function() { return "Person"; };

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  store.pushMany('tag', [{ id: 0, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);
  store.push('person', { id: 1, name: "Tom Dale", tag: 0 });

  store.find('person', 1).then(async(function(person) {
    equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

    equal(get(person, 'tag') instanceof Tag, true, "the tag property should return a tag");
    equal(get(person, 'tag.name'), "friendly", "the tag shuld have name");

    strictEqual(get(person, 'tag'), get(person, 'tag'), "the returned object is always the same");
    asyncEqual(get(person, 'tag'), store.find(Tag, 0), "relationship object is the same as object retrieved directly");
  }));
});

})();

(function() {
var env, store, Person, Dog;

module("unit/model/rollback - model.rollback()", {
  setup: function() {
    Person = DS.Model.extend({
      firstName: DS.attr(),
      lastName: DS.attr()
    });

    env = setupStore({ person: Person });
    store = env.store;
  }
});

test("changes to attributes can be rolled back", function() {
  var person = store.push('person', { id: 1, firstName: "Tom", lastName: "Dale" });

  person.set('firstName', "Thomas");

  equal(person.get('firstName'), "Thomas");

  person.rollback();

  equal(person.get('firstName'), "Tom");
  equal(person.get('isDirty'), false);
});

test("changes to attributes made after a record is in-flight only rolls back the local changes", function() {
  env.adapter.updateRecord = function(store, type, record) {
    return Ember.RSVP.resolve();
  };

  var person = store.push('person', { id: 1, firstName: "Tom", lastName: "Dale" });

  person.set('firstName', "Thomas");

  // Make sure the save is async
  Ember.run(function() {
    var saving = person.save();

    equal(person.get('firstName'), "Thomas");

    person.set('lastName', "Dolly");

    equal(person.get('lastName'), "Dolly");

    person.rollback();

    equal(person.get('firstName'), "Thomas");
    equal(person.get('lastName'), "Dale");
    equal(person.get('isSaving'), true);

    saving.then(async(function() {
      equal(person.get('isDirty'), false, "The person is now clean");
    }));
  });
});

test("a record's changes can be made if it fails to save", function() {
  env.adapter.updateRecord = function(store, type, record) {
    return Ember.RSVP.reject();
  };

  var person = store.push('person', { id: 1, firstName: "Tom", lastName: "Dale" });

  person.set('firstName', "Thomas");

  person.save().then(null, async(function() {
    equal(person.get('isError'), true);

    person.rollback();

    equal(person.get('firstName'), "Tom");
    equal(person.get('isError'), false);
  }));
});

test("new record can be rollbacked", function() {
  var person = store.createRecord('person', { id: 1 });

  equal(person.get('isNew'), true, "must be new");
  equal(person.get('isDirty'), true, "must be dirty");

  Ember.run(person, 'rollback');

  equal(person.get('isNew'), false, "must not be new");
  equal(person.get('isDirty'), false, "must not be dirty");
  equal(person.get('isDeleted'), true, "must be deleted");
});

test("deleted record can be rollbacked", function() {
  var person = store.push('person', { id: 1 });

  person.deleteRecord();

  equal(person.get('isDeleted'), true, "must be deleted");

  person.rollback();

  equal(person.get('isDeleted'), false, "must not be deleted");
  equal(person.get('isDirty'), false, "must not be dirty");
});

test("invalid record can be rollbacked", function() {
  Dog = DS.Model.extend({
    name: DS.attr()
  });

  var adapter = DS.RESTAdapter.extend({
    ajax: function(url, type, hash) {
      var adapter = this;

      return new Ember.RSVP.Promise(function(resolve, reject) {
        Ember.run.next(function(){
          reject(adapter.ajaxError({}));
        });
      });
    },

    ajaxError: function(jqXHR) {
      return new DS.InvalidError(jqXHR);
    }
  });

  env = setupStore({ dog: Dog, adapter: adapter});
  var dog = env.store.push('dog', { id: 1, name: "Pluto" });

  dog.set('name', "is a dwarf planet");

  dog.save().then(null, async(function() {
    dog.rollback();

    equal(dog.get('name'), "Pluto");
    ok(dog.get('isValid'));
  }));
});

})();

(function() {
var get = Ember.get, set = Ember.set;

var Person, store, array;

module("unit/model - DS.Model", {
  setup: function() {
    store = createStore();

    Person = DS.Model.extend({
      name: DS.attr('string'),
      isDrugAddict: DS.attr('boolean')
    });
  },

  teardown: function() {
    Person = null;
    store = null;
  }
});

test("can have a property set on it", function() {
  var record = store.createRecord(Person);
  set(record, 'name', 'bar');

  equal(get(record, 'name'), 'bar', "property was set on the record");
});

test("setting a property on a record that has not changed does not cause it to become dirty", function() {
  store.push(Person, { id: 1, name: "Peter", isDrugAddict: true });
  store.find(Person, 1).then(async(function(person) {
    equal(person.get('isDirty'), false, "precond - person record should not be dirty");
    person.set('name', "Peter");
    person.set('isDrugAddict', true);
    equal(person.get('isDirty'), false, "record does not become dirty after setting property to old value");
  }));
});

test("resetting a property on a record cause it to become clean again", function() {
  store.push(Person, { id: 1, name: "Peter", isDrugAddict: true });
  store.find(Person, 1).then(async(function(person) {
    equal(person.get('isDirty'), false, "precond - person record should not be dirty");
    person.set('isDrugAddict', false);
    equal(person.get('isDirty'), true, "record becomes dirty after setting property to a new value");
    person.set('isDrugAddict', true);
    equal(person.get('isDirty'), false, "record becomes clean after resetting property to the old value");
  }));
});

test("a record reports its unique id via the `id` property", function() {
  store.push(Person, { id: 1 });

  store.find(Person, 1).then(async(function(record) {
    equal(get(record, 'id'), 1, "reports id as id by default");
  }));
});

test("a record's id is included in its toString representation", function() {
  store.push(Person, { id: 1 });

  store.find(Person, 1).then(async(function(record) {
    equal(record.toString(), '<(subclass of DS.Model):'+Ember.guidFor(record)+':1>', "reports id in toString");
  }));
});

test("trying to set an `id` attribute should raise", function() {
  Person = DS.Model.extend({
    id: DS.attr('number'),
    name: "Scumdale"
  });

  expectAssertion(function() {
    store.push(Person, { id: 1, name: "Scumdale" });
    var person = store.find(Person, 1);
  }, /You may not set `id`/);
});

test("it should use `_reference` and not `reference` to store its reference", function() {
  store.push(Person, { id: 1 });

  store.find(Person, 1).then(async(function(record) {
    equal(record.get('reference'), undefined, "doesn't shadow reference key");
  }));
});

test("it should cache attributes", function() {
  var store = createStore();

  var Post = DS.Model.extend({
    updatedAt: DS.attr('string')
  });

  var dateString = "Sat, 31 Dec 2011 00:08:16 GMT";
  var date = new Date(dateString);

  store.push(Post, { id: 1 });

  store.find(Post, 1).then(async(function(record) {
    record.set('updatedAt', date);
    deepEqual(date, get(record, 'updatedAt'), "setting a date returns the same date");
    strictEqual(get(record, 'updatedAt'), get(record, 'updatedAt'), "second get still returns the same object");
  }));
});

module("unit/model - DS.Model updating", {
  setup: function() {
    array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
    Person = DS.Model.extend({ name: DS.attr('string') });
    store = createStore();
    store.pushMany(Person, array);
  },
  teardown: function() {
    Person = null;
    store = null;
    array = null;
  }
});

test("a DS.Model can update its attributes", function() {
  store.find(Person, 2).then(async(function(person) {
    set(person, 'name', "Brohuda Katz");
    equal(get(person, 'name'), "Brohuda Katz", "setting took hold");
  }));
});

test("a DS.Model can have a defaultValue", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string', { defaultValue: "unknown" })
  });

  var tag = store.createRecord(Tag);

  equal(get(tag, 'name'), "unknown", "the default value is found");

  set(tag, 'name', null);

  equal(get(tag, 'name'), null, "null doesn't shadow defaultValue");
});

test("a defaultValue for an attribite can be a function", function() {
  var Tag = DS.Model.extend({
    createdAt: DS.attr('string', {
      defaultValue: function() {
        return "le default value";
      }
    })
  });

  var tag = store.createRecord(Tag);
  equal(get(tag, 'createdAt'), "le default value", "the defaultValue function is evaluated");
});

module("unit/model - with a simple Person model", {
  setup: function() {
    array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
    Person = DS.Model.extend({
      name: DS.attr('string')
    });
    store = createStore({
      person: Person
    });
    store.pushMany(Person, array);
  },
  teardown: function() {
    Person = null;
    store = null;
    array = null;
  }
});

test("can ask if record with a given id is loaded", function() {
  equal(store.recordIsLoaded(Person, 1), true, 'should have person with id 1');
  equal(store.recordIsLoaded('person', 1), true, 'should have person with id 1');
  equal(store.recordIsLoaded(Person, 4), false, 'should not have person with id 4');
  equal(store.recordIsLoaded('person', 4), false, 'should not have person with id 4');
});

test("a listener can be added to a record", function() {
  var count = 0;
  var F = function() { count++; };
  var record = store.createRecord(Person);

  record.on('event!', F);
  record.trigger('event!');

  equal(count, 1, "the event was triggered");

  record.trigger('event!');

  equal(count, 2, "the event was triggered");
});

test("when an event is triggered on a record the method with the same name is invoked with arguments", function(){
  var count = 0;
  var F = function() { count++; };
  var record = store.createRecord(Person);

  record.eventNamedMethod = F;

  record.trigger('eventNamedMethod');

  equal(count, 1, "the corresponding method was called");
});

test("when a method is invoked from an event with the same name the arguments are passed through", function(){
  var eventMethodArgs = null;
  var F = function() { eventMethodArgs = arguments; };
  var record = store.createRecord(Person);

  record.eventThatTriggersMethod = F;

  record.trigger('eventThatTriggersMethod', 1, 2);

  equal( eventMethodArgs[0], 1);
  equal( eventMethodArgs[1], 2);
});

var converts = function(type, provided, expected) {
  var Model = DS.Model.extend({
    name: DS.attr(type)
  });

  var container = new Ember.Container();

  var testStore = createStore({model: Model}),
      serializer = DS.JSONSerializer.create({ store: testStore, container: container });

  testStore.push(Model, serializer.normalize(Model, { id: 1, name: provided }));
  testStore.push(Model, serializer.normalize(Model, { id: 2 }));

  testStore.find('model', 1).then(async(function(record) {
    deepEqual(get(record, 'name'), expected, type + " coerces " + provided + " to " + expected);
  }));

  // See: Github issue #421
  // record = testStore.find(Model, 2);
  // set(record, 'name', provided);
  // deepEqual(get(record, 'name'), expected, type + " coerces " + provided + " to " + expected);
};

var convertsFromServer = function(type, provided, expected) {
  var Model = DS.Model.extend({
    name: DS.attr(type)
  });

  var container = new Ember.Container();

  var testStore = createStore({model: Model}),
      serializer = DS.JSONSerializer.create({ store: testStore, container: container });

  testStore.push(Model, serializer.normalize(Model, { id: "1", name: provided }));
  testStore.find('model', 1).then(async(function(record) {
    deepEqual(get(record, 'name'), expected, type + " coerces " + provided + " to " + expected);
  }));
};

var convertsWhenSet = function(type, provided, expected) {
  var Model = DS.Model.extend({
    name: DS.attr(type)
  });

  var testStore = createStore({model: Model});

  testStore.push(Model, { id: 2 });
  var record = testStore.find('model', 2).then(async(function(record) {
    set(record, 'name', provided);
    deepEqual(record.serialize().name, expected, type + " saves " + provided + " as " + expected);
  }));
};

test("a DS.Model can describe String attributes", function() {
  converts('string', "Scumbag Tom", "Scumbag Tom");
  converts('string', 1, "1");
  converts('string', "", "");
  converts('string', null, null);
  converts('string', undefined, null);
  convertsFromServer('string', undefined, null);
});

test("a DS.Model can describe Number attributes", function() {
  converts('number', "1", 1);
  converts('number', "0", 0);
  converts('number', 1, 1);
  converts('number', 0, 0);
  converts('number', "", null);
  converts('number', null, null);
  converts('number', undefined, null);
  converts('number', true, 1);
  converts('number', false, 0);
});

test("a DS.Model can describe Boolean attributes", function() {
  converts('boolean', "1", true);
  converts('boolean', "", false);
  converts('boolean', 1, true);
  converts('boolean', 0, false);
  converts('boolean', null, false);
  converts('boolean', true, true);
  converts('boolean', false, false);
});

test("a DS.Model can describe Date attributes", function() {
  converts('date', null, null);
  converts('date', undefined, undefined);

  var dateString = "Sat, 31 Dec 2011 00:08:16 GMT";
  var date = new Date(dateString);

  var store = createStore();

  var Person = DS.Model.extend({
    updatedAt: DS.attr('date')
  });

  store.push(Person, { id: 1 });
  store.find(Person, 1).then(async(function(record) {
    record.set('updatedAt', date);
    deepEqual(date, get(record, 'updatedAt'), "setting a date returns the same date");
  }));

  convertsFromServer('date', dateString, date);
  convertsWhenSet('date', date, dateString);
});

test("don't allow setting", function(){
  var store = createStore();

  var Person = DS.Model.extend();
  var record = store.createRecord(Person);

  raises(function(){
    record.set('isLoaded', true);
  }, "raised error when trying to set an unsettable record");
});

test("ensure model exits loading state, materializes data and fulfills promise only after data is available", function () {
  var store = createStore({
    adapter: DS.Adapter.extend({
      find: function(store, type, id) {
        return Ember.RSVP.resolve({ id: 1, name: "John", isDrugAddict: false });
      }
    })
  });

  store.find(Person, 1).then(async(function(person) {
    equal(get(person, 'currentState.stateName'), 'root.loaded.saved', 'model is in loaded state');
    equal(get(person, 'isLoaded'), true, 'model is loaded');
  }));
});

test("A DS.Model can be JSONified", function() {
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var store = createStore({ person: Person });
  var record = store.createRecord('person', { name: "TomHuda" });
  deepEqual(record.toJSON(), { name: "TomHuda" });
});

})();

(function() {
var get = Ember.get, set = Ember.set;
var indexOf = Ember.EnumerableUtils.indexOf;

var Person, array;

module("unit/record_array - DS.RecordArray", {
  setup: function() {
    array = [{ id: '1', name: "Scumbag Dale" }, { id: '2', name: "Scumbag Katz" }, { id: '3', name: "Scumbag Bryn" }];

    Person = DS.Model.extend({
      name: DS.attr('string')
    });
  }
});

test("a record array is backed by records", function() {
  var store = createStore();
  store.pushMany(Person, array);

  store.findByIds(Person, [1,2,3]).then(async(function(records) {
    for (var i=0, l=get(array, 'length'); i<l; i++) {
      deepEqual(records[i].getProperties('id', 'name'), array[i], "a record array materializes objects on demand");
    }
  }));
});

test("acts as a live query", function() {
  var store = createStore();

  var recordArray = store.all(Person);
  store.push(Person, { id: 1, name: 'wycats' });
  equal(get(recordArray, 'lastObject.name'), 'wycats');

  store.push(Person, { id: 2, name: 'brohuda' });
  equal(get(recordArray, 'lastObject.name'), 'brohuda');
});

test("a loaded record is removed from a record array when it is deleted", function() {
  var Tag = DS.Model.extend({
    people: DS.hasMany('person')
  });

  Person.reopen({
    tag: DS.belongsTo('tag')
  });

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  store.pushMany('person', array);
  store.push('tag', { id: 1 });

  var asyncRecords = Ember.RSVP.hash({
    scumbag: store.find('person', 1),
    tag: store.find('tag', 1)
  });

  asyncRecords.then(async(function(records) {
    var scumbag = records.scumbag, tag = records.tag;

    tag.get('people').addObject(scumbag);
    equal(get(scumbag, 'tag'), tag, "precond - the scumbag's tag has been set");

    var recordArray = tag.get('people');

    equal(get(recordArray, 'length'), 1, "precond - record array has one item");
    equal(get(recordArray.objectAt(0), 'name'), "Scumbag Dale", "item at index 0 is record with id 1");

    scumbag.deleteRecord();

    equal(get(recordArray, 'length'), 0, "record is removed from the record array");
  }));
});

// GitHub Issue #168
test("a newly created record is removed from a record array when it is deleted", function() {
  var store = createStore(),
      recordArray;

  recordArray = store.all(Person);

  var scumbag = store.createRecord(Person, {
    name: "Scumbag Dale"
  });

  equal(get(recordArray, 'length'), 1, "precond - record array already has the first created item");

  // guarantee coalescence
  Ember.run(function() {
    store.createRecord(Person, { name: 'p1'});
    store.createRecord(Person, { name: 'p2'});
    store.createRecord(Person, { name: 'p3'});
  });

  equal(get(recordArray, 'length'), 4, "precond - record array has the created item");
  equal(get(recordArray.objectAt(0), 'name'), "Scumbag Dale", "item at index 0 is record with id 1");

  scumbag.deleteRecord();

  equal(get(recordArray, 'length'), 3, "record is removed from the record array");

  recordArray.objectAt(0).set('name', 'toto');

  equal(get(recordArray, 'length'), 3, "record is still removed from the record array");
});

test("a record array returns undefined when asking for a member outside of its content Array's range", function() {
  var store = createStore();

  store.pushMany(Person, array);

  var recordArray = store.all(Person);

  strictEqual(recordArray.objectAt(20), undefined, "objects outside of the range just return undefined");
});

// This tests for a bug in the recordCache, where the records were being cached in the incorrect order.
test("a record array should be able to be enumerated in any order", function() {
  var store = createStore();
  store.pushMany(Person, array);

  var recordArray = store.all(Person);

  equal(get(recordArray.objectAt(2), 'id'), 3, "should retrieve correct record at index 2");
  equal(get(recordArray.objectAt(1), 'id'), 2, "should retrieve correct record at index 1");
  equal(get(recordArray.objectAt(0), 'id'), 1, "should retrieve correct record at index 0");
});

var shouldContain = function(array, item) {
  ok(indexOf(array, item) !== -1, "array should contain "+item.get('name'));
};

var shouldNotContain = function(array, item) {
  ok(indexOf(array, item) === -1, "array should not contain "+item.get('name'));
};

test("an AdapterPopulatedRecordArray knows if it's loaded or not", function() {
  var env = setupStore({ person: Person }),
      store = env.store;

  env.adapter.findQuery = function(store, type, query, recordArray) {
    return Ember.RSVP.resolve(array);
  };

  store.find('person', { page: 1 }).then(async(function(people) {
    equal(get(people, 'isLoaded'), true, "The array is now loaded");
  }));
});

})();

(function() {
var get = Ember.get, set = Ember.set;

var rootState, stateName;

module("unit/states - Flags for record states", {
  setup: function() {
    rootState = DS.RootState;
  }
});

var isTrue = function(flag) {
  equal(get(rootState, stateName + "." + flag), true, stateName + "." + flag + " should be true");
};

var isFalse = function(flag) {
  equal(get(rootState, stateName + "." + flag), false, stateName + "." + flag + " should be false");
};

test("the empty state", function() {
  stateName = "empty";
  isFalse("isLoading");
  isFalse("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
});

test("the loading state", function() {
  stateName = "loading";
  isTrue("isLoading");
  isFalse("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
});

test("the loaded state", function() {
  stateName = "loaded";
  isFalse("isLoading");
  isTrue("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
});

test("the updated state", function() {
  stateName = "loaded.updated";
  isFalse("isLoading");
  isTrue("isLoaded");
  isTrue("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
});

test("the saving state", function() {
  stateName = "loaded.updated.inFlight";
  isFalse("isLoading");
  isTrue("isLoaded");
  isTrue("isDirty");
  isTrue("isSaving");
  isFalse("isDeleted");
});

test("the deleted state", function() {
  stateName = "deleted";
  isFalse("isLoading");
  isTrue("isLoaded");
  isTrue("isDirty");
  isFalse("isSaving");
  isTrue("isDeleted");
});

test("the deleted.saving state", function() {
  stateName = "deleted.inFlight";
  isFalse("isLoading");
  isTrue("isLoaded");
  isTrue("isDirty");
  isTrue("isSaving");
  isTrue("isDeleted");
});

test("the deleted.saved state", function() {
  stateName = "deleted.saved";
  isFalse("isLoading");
  isTrue("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isTrue("isDeleted");
});

})();

(function() {
var get = Ember.get, set = Ember.set;
var resolve = Ember.RSVP.resolve;
var TestAdapter, store;

module("unit/store/adapter_interop - DS.Store working with a DS.Adapter", {
  setup: function() {
    TestAdapter = DS.Adapter.extend();
  },
  teardown: function() {
    if (store) { store.destroy(); }
  }
});

test("Adapter can be set as a factory", function() {
  store = createStore({adapter: TestAdapter});

  ok(store.get('defaultAdapter') instanceof TestAdapter);
});

test('Adapter can be set as a name', function() {
  store = createStore({adapter: '_rest'});

  ok(store.get('defaultAdapter') instanceof DS.RESTAdapter);
});

test('Adapter can not be set as an instance', function() {
  store = DS.Store.create({
    adapter: DS.Adapter.create()
  });
  var assert = Ember.assert;
  Ember.assert = function() { ok(true, "raises an error when passing in an instance"); };
  store.get('defaultAdapter');
  Ember.assert = assert;
});

test("Calling Store#find invokes its adapter#find", function() {
  expect(4);

  var adapter = TestAdapter.extend({
    find: function(store, type, id) {
      ok(true, "Adapter#find was called");
      equal(store, currentStore, "Adapter#find was called with the right store");
      equal(type,  currentType,  "Adapter#find was called with the type passed into Store#find");
      equal(id,    1,            "Adapter#find was called with the id passed into Store#find");

      return Ember.RSVP.resolve({ id: 1 });
    }
  });

  var currentStore = createStore({ adapter: adapter });
  var currentType = DS.Model.extend();

  currentStore.find(currentType, 1);
});

test("Returning a promise from `find` asynchronously loads data", function() {
  var adapter = TestAdapter.extend({
    find: function(store, type, id) {
      return resolve({ id: 1, name: "Scumbag Dale" });
    }
  });

  var currentStore = createStore({ adapter: adapter });
  var currentType = DS.Model.extend({
    name: DS.attr('string')
  });

  currentStore.find(currentType, 1).then(async(function(object) {
    strictEqual(get(object, 'name'), "Scumbag Dale", "the data was pushed");
  }));
});

test("IDs provided as numbers are coerced to strings", function() {
  var adapter = TestAdapter.extend({
    find: function(store, type, id) {
      equal(typeof id, 'string', "id has been normalized to a string");
      return resolve({ id: 1, name: "Scumbag Sylvain" });
    }
  });

  var currentStore = createStore({ adapter: adapter });
  var currentType = DS.Model.extend({
    name: DS.attr('string')
  });

  currentStore.find(currentType, 1).then(async(function(object) {
    equal(typeof object.get('id'), 'string', "id was coerced to a string");
    currentStore.push(currentType, { id: 2, name: "Scumbag Sam Saffron" });
    return currentStore.find(currentType, 2);
  })).then(async(function(object) {
    ok(object, "object was found");
    equal(typeof object.get('id'), 'string', "id is a string despite being supplied and searched for as a number");
  }));
});


var array = [{ id: "1", name: "Scumbag Dale" }, { id: "2", name: "Scumbag Katz" }, { id: "3", name: "Scumbag Bryn" }];

test("can load data for the same record if it is not dirty", function() {
  var store = createStore();
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store.push(Person, { id: 1, name: "Tom Dale" });

  var tom = store.find(Person, 1).then(async(function(tom) {
    equal(get(tom, 'isDirty'), false, "precond - record is not dirty");
    equal(get(tom, 'name'), "Tom Dale", "returns the correct name");

    store.push(Person, { id: 1, name: "Captain Underpants" });
    equal(get(tom, 'name'), "Captain Underpants", "updated record with new date");
  }));

});

/*
test("DS.Store loads individual records without explicit IDs with a custom primaryKey", function() {
  var store = DS.Store.create();
  var Person = DS.Model.extend({ name: DS.attr('string'), primaryKey: 'key' });

  store.load(Person, { key: 1, name: "Tom Dale" });

  var tom = store.find(Person, 1);
  equal(get(tom, 'name'), "Tom Dale", "the person was successfully loaded for the given ID");
});
*/

test("pushMany extracts ids from an Array of hashes if no ids are specified", function() {
  var store = createStore();

  var Person = DS.Model.extend({ name: DS.attr('string') });

  store.pushMany(Person, array);
  store.find(Person, 1).then(async(function(person) {
    equal(get(person, 'name'), "Scumbag Dale", "correctly extracted id for loaded data");
  }));
});

test("loadMany takes an optional Object and passes it on to the Adapter", function() {
  var passedQuery = { page: 1 };

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var adapter = TestAdapter.extend({
    findQuery: function(store, type, query) {
      equal(type, Person, "The type was Person");
      equal(query, passedQuery, "The query was passed in");
      return Ember.RSVP.resolve([]);
    }
  });

  var store = createStore({
    adapter: adapter
  });

  store.find(Person, passedQuery);
});

test("Find with query calls the correct extract", function() {
  var passedQuery = { page: 1 };

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var adapter = TestAdapter.extend({
    findQuery: function(store, type, query) {
      return Ember.RSVP.resolve([]);
    }
  });

  var callCount = 0;

  var ApplicationSerializer = DS.JSONSerializer.extend({
    extractFindQuery: function(store, type, payload) {
      callCount++;
      return [];
    }
  });

  var store = createStore({
    adapter: adapter
  });

  store.container.register('serializer:application', ApplicationSerializer);

  store.find(Person, passedQuery);
  equal(callCount, 1, 'extractFindQuery was called');
});

test("all(type) returns a record array of all records of a specific type", function() {
  var store = createStore();
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store.push(Person, { id: 1, name: "Tom Dale" });

  var results = store.all(Person);
  equal(get(results, 'length'), 1, "record array should have the original object");
  equal(get(results.objectAt(0), 'name'), "Tom Dale", "record has the correct information");

  store.push(Person, { id: 2, name: "Yehuda Katz" });
  equal(get(results, 'length'), 2, "record array should have the new object");
  equal(get(results.objectAt(1), 'name'), "Yehuda Katz", "record has the correct information");

  strictEqual(results, store.all(Person), "subsequent calls to all return the same recordArray)");
});

test("a new record of a particular type is created via store.createRecord(type)", function() {
  var store = createStore();
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var person = store.createRecord(Person);

  equal(get(person, 'isLoaded'), true, "A newly created record is loaded");
  equal(get(person, 'isNew'), true, "A newly created record is new");
  equal(get(person, 'isDirty'), true, "A newly created record is dirty");

  set(person, 'name', "Braaahm Dale");

  equal(get(person, 'name'), "Braaahm Dale", "Even if no hash is supplied, `set` still worked");
});

test("a new record with a specific id can't be created if this id is already used in the store", function() {
  var store = createStore();
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  Person.reopenClass({
    toString: function() {
      return 'Person';
    }
  });

  store.createRecord(Person, {id: 5});

  expectAssertion(function() {
    store.createRecord(Person, {id: 5});
  }, /The id 5 has already been used with another record of type Person/);
});

test("an initial data hash can be provided via store.createRecord(type, hash)", function() {
  var store = createStore();
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var person = store.createRecord(Person, { name: "Brohuda Katz" });

  equal(get(person, 'isLoaded'), true, "A newly created record is loaded");
  equal(get(person, 'isNew'), true, "A newly created record is new");
  equal(get(person, 'isDirty'), true, "A newly created record is dirty");

  equal(get(person, 'name'), "Brohuda Katz", "The initial data hash is provided");
});

test("if an id is supplied in the initial data hash, it can be looked up using `store.find`", function() {
  var store = createStore();
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var person = store.createRecord(Person, { id: 1, name: "Brohuda Katz" });

  store.find(Person, 1).then(async(function(again) {
    strictEqual(person, again, "the store returns the loaded object");
  }));
});

test("records inside a collection view should have their ids updated", function() {
  var Person = DS.Model.extend();

  var idCounter = 1;
  var adapter = TestAdapter.extend({
    createRecord: function(store, type, record) {
      return Ember.RSVP.resolve({name: record.get('name'), id: idCounter++});
    }
  });

  var store = createStore({
    adapter: adapter
  });

  var container = Ember.CollectionView.create({
    content: store.all(Person)
  });

  container.appendTo('#qunit-fixture');

  var tom = store.createRecord(Person, {name: 'Tom Dale'});
  var yehuda = store.createRecord(Person, {name: 'Yehuda Katz'});

  Ember.RSVP.all([ tom.save(), yehuda.save() ]).then(async(function() {
    container.content.forEach(function(person, index) {
      equal(person.get('id'), index + 1, "The record's id should be correct.");
    });

    container.destroy();
  }));
});

})();

(function() {
var get = Ember.get, set = Ember.set;
var store, Record;

module("unit/store/createRecord - Store creating records", {
  setup: function() {
    store = createStore({ adapter: DS.Adapter.extend()});

    Record = DS.Model.extend({
      title: DS.attr('string')
    });
  }
});

test("doesn't modify passed in properties hash", function(){
  var attributes = { foo: 'bar' },
      record1 = store.createRecord(Record, attributes),
      record2 = store.createRecord(Record, attributes);

  deepEqual(attributes, { foo: 'bar' }, "The properties hash is not modified");
});

})();

(function() {
var container, store;

module("unit/store/model_for - DS.Store#modelFor", {
  setup: function() {
    store = createStore({blogPost: DS.Model.extend()});
    container = store.container;
  },

  teardown: function() {
    container.destroy();
    store.destroy();
  }
});

test("sets a normalized key as typeKey", function() {
  container.normalize = function(fullName){
    return Ember.String.camelize(fullName);
  };

  ok(store.modelFor("blog.post").typeKey, "blogPost", "typeKey is normalized");
});

})();

(function() {
var env, store, Person, PhoneNumber, Post;
var attr = DS.attr, hasMany = DS.hasMany, belongsTo = DS.belongsTo;

module("unit/store/push - DS.Store#push", {
  setup: function() {
    Person = DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      phoneNumbers: hasMany('phone-number')
    });

    PhoneNumber = DS.Model.extend({
      number: attr('string'),
      person: belongsTo('person')
    });

    Post = DS.Model.extend({
      postTitle: attr('string')
    });

    env = setupStore({"post": Post,
                      "person": Person,
                      "phone-number": PhoneNumber});

    store = env.store;

    env.container.register('serializer:post', DS.RESTSerializer);
  },

  teardown: function() {
    Ember.run(function() {
      store.destroy();
    });
  }
});

test("Calling push with a normalized hash returns a record", function() {
  var person = store.push('person', {
    id: 'wat',
    firstName: "Yehuda",
    lastName: "Katz"
  });

  store.find('person', 'wat').then(async(function(foundPerson) {
    equal(foundPerson, person, "record returned via load() is the same as the record returned from find()");
    deepEqual(foundPerson.getProperties('id', 'firstName', 'lastName'), {
      id: 'wat',
      firstName: "Yehuda",
      lastName: "Katz"
    });
  }));
});

test("Supplying a model class for `push` is the same as supplying a string", function () {
  var Programmer = Person.extend();
  env.container.register('model:programmer', Programmer);

  var programmer = store.push(Programmer, {
    id: 'wat',
    firstName: "Yehuda",
    lastName: "Katz"
  });

  store.find('programmer', 'wat').then(async(function(foundProgrammer) {
    deepEqual(foundProgrammer.getProperties('id', 'firstName', 'lastName'), {
      id: 'wat',
      firstName: "Yehuda",
      lastName: "Katz"
    });
  }));
});

test("Calling push triggers `didLoad` even if the record hasn't been requested from the adapter", function() {
  Person.reopen({
    didLoad: async(function() {
      ok(true, "The didLoad callback was called");
    })
  });

  store.push('person', {
    id: 'wat',
    firstName: "Yehuda",
    lastName: "Katz"
  });
});

test("Calling update with partial records updates just those attributes", function() {
  var person = store.push('person', {
    id: 'wat',
    firstName: "Yehuda",
    lastName: "Katz"
  });

  store.update('person', {
    id: 'wat',
    lastName: "Katz!"
  });

  store.find('person', 'wat').then(async(function(foundPerson) {
    equal(foundPerson, person, "record returned via load() is the same as the record returned from find()");
    deepEqual(foundPerson.getProperties('id', 'firstName', 'lastName'), {
      id: 'wat',
      firstName: "Yehuda",
      lastName: "Katz!"
    });
  }));
});

test("Calling push with a normalized hash containing related records returns a record", function() {
  var number1 = store.push('phone-number', {
    id: 1,
    number: '5551212',
    person: 'wat'
  });

  var number2 = store.push('phone-number', {
    id: 2,
    number: '5552121',
    person: 'wat'
  });

  var person = store.push('person', {
    id: 'wat',
    firstName: 'John',
    lastName: 'Smith',
    phoneNumbers: [number1, number2]
  });

  deepEqual(person.get('phoneNumbers').toArray(), [ number1, number2 ], "phoneNumbers array is correct");
});

test("Calling push with a normalized hash containing IDs of related records returns a record", function() {
  Person.reopen({
    phoneNumbers: hasMany('phone-number', { async: true })
  });

  env.adapter.find = function(store, type, id) {
    if (id === "1") {
      return Ember.RSVP.resolve({
        id: 1,
        number: '5551212',
        person: 'wat'
      });
    }

    if (id === "2") {
      return Ember.RSVP.resolve({
        id: 2,
        number: '5552121',
        person: 'wat'
      });
    }
  };

  var person = store.push('person', {
    id: 'wat',
    firstName: 'John',
    lastName: 'Smith',
    phoneNumbers: ["1", "2"]
  });

  person.get('phoneNumbers').then(async(function(phoneNumbers) {
    deepEqual(phoneNumbers.map(function(item) {
      return item.getProperties('id', 'number', 'person');
    }), [{
      id: "1",
      number: '5551212',
      person: person
    }, {
      id: "2",
      number: '5552121',
      person: person
    }]);
  }));
});

test("Calling pushPayload allows pushing raw JSON", function () {
  store.pushPayload('post', {posts: [{
    id: '1',
    postTitle: "Ember rocks"
  }]});

  var post = store.getById('post', 1);

  equal(post.get('postTitle'), "Ember rocks", "you can push raw JSON into the store");

  store.pushPayload('post', {posts: [{
    id: '1',
    postTitle: "Ember rocks (updated)"
  }]});

  equal(post.get('postTitle'), "Ember rocks (updated)", "You can update data in the store");
});

test("Calling pushPayload without a type uses application serializer", function () {
  expect(2);

  env.container.register('serializer:application', DS.RESTSerializer.extend({
    pushPayload: function(store, payload) {
      ok(true, "pushPayload is called on Application serializer");
      return this._super(store, payload);
    }
  }));

  store.pushPayload({posts: [{
    id: '1',
    postTitle: "Ember rocks"
  }]});

  var post = store.getById('post', 1);

  equal(post.get('postTitle'), "Ember rocks", "you can push raw JSON into the store");
});

})();

(function() {
var container, store, app;

module("unit/store/serializer_for - DS.Store#serializerFor", {
  setup: function() {
    store = createStore({person: DS.Model.extend()});
    container = store.container;
  },

  teardown: function() {
    container.destroy();
    store.destroy();
  }
});

test("Calling serializerFor looks up 'serializer:<type>' from the container", function() {
  var PersonSerializer = DS.JSONSerializer.extend();

  container.register('serializer:person', PersonSerializer);

  ok(store.serializerFor('person') instanceof PersonSerializer, "serializer returned from serializerFor is an instance of the registered Serializer class");
});

test("Calling serializerFor with a type that has not been registered looks up the default ApplicationSerializer", function() {
  var ApplicationSerializer = DS.JSONSerializer.extend();

  container.register('serializer:application', ApplicationSerializer);

  ok(store.serializerFor('person') instanceof ApplicationSerializer, "serializer returned from serializerFor is an instance of ApplicationSerializer");
});

test("Calling serializerFor with a type that has not been registered and in an application that does not have an ApplicationSerializer looks up the default Ember Data serializer", function() {
  ok(store.serializerFor('person') instanceof DS.JSONSerializer, "serializer returned from serializerFor is an instance of DS.JSONSerializer");
});

})();

(function() {
var get = Ember.get, set = Ember.set;
var store, tryToFind, Record;

module("unit/store/unload - Store unloading records", {
  setup: function() {
    store = createStore({ adapter: DS.Adapter.extend({
        find: function(store, type, id) {
          tryToFind = true;
          return Ember.RSVP.resolve({ id: id, wasFetched: true });
        }
      })
    });

    Record = DS.Model.extend({
      title: DS.attr('string')
    });
  },

  teardown: function() {
    Ember.run(store, 'destroy');
  }
});

test("unload a dirty record", function() {
  store.push(Record, {id: 1, title: 'toto'});

  store.find(Record, 1).then(async(function(record) {
    record.set('title', 'toto2');

    equal(get(record, 'isDirty'), true, "record is dirty");
    expectAssertion(function() {
      record.unloadRecord();
    }, "You can only unload a loaded, non-dirty record.", "can not unload dirty record");
  }));
});

test("unload a record", function() {
  store.push(Record, {id: 1, title: 'toto'});

  store.find(Record, 1).then(async(function(record) {
    equal(get(record, 'id'), 1, "found record with id 1");
    equal(get(record, 'isDirty'), false, "record is not dirty");

    store.unloadRecord(record);

    equal(get(record, 'isDirty'), false, "record is not dirty");
    equal(get(record, 'isDeleted'), true, "record is deleted");

    tryToFind = false;
    store.find(Record, 1);
    equal(tryToFind, true, "not found record with id 1");
  }));
});

module("DS.Store - unload record with relationships");

test("can commit store after unload record with relationships", function() {
  store = createStore({ adapter: DS.Adapter.extend({
      find: function() {
        return Ember.RSVP.resolve({ id: 1, description: 'cuisinart', brand: 1 });
      },
      createRecord: function(store, type, record) {
        return Ember.RSVP.resolve();
      }
    })
  });

  var like, product, brand;

  var Brand = DS.Model.extend({
    name: DS.attr('string')
  });

  var Product = DS.Model.extend({
    description: DS.attr('string'),
    brand: DS.belongsTo(Brand)
  });

  var Like = DS.Model.extend({
    product: DS.belongsTo(Product)
  });

  store.push(Brand, { id: 1, name: 'EmberJS' });
  store.push(Product, { id: 1, description: 'toto', brand: 1 });

  var asyncRecords = Ember.RSVP.hash({
    brand: store.find(Brand, 1),
    product: store.find(Product, 1)
  });

  asyncRecords.then(async(function(records) {
    like = store.createRecord(Like, { id: 1, product: product });
    records.like = like.save();
    return Ember.RSVP.hash(records);
  })).then(async(function(records) {
    store.unloadRecord(records.product);

    return store.find(Product, 1);
  })).then(async(function(product) {
    equal(product.get('description'), 'cuisinart', "The record was unloaded and the adapter's `find` was called");
    store.destroy();
  }));
});

})();

