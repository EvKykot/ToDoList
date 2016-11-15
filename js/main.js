	
	var server = {
		templates: {
			views: {
				main: document.getElementById( 'myToDoTemplate' ).innerHTML
			},
			task: {
				main: document.getElementById( 'newTaskWrapper' ).innerHTML
			}
		}
	};

	//////////////////////////////////////
	/////////////// MODEL ////////////////
	//////////////////////////////////////

	function Model ( appName ) {
		this.tasks = [];
		this.infoFromServer = [];
		this.localStorageKey = appName;
		this.xhr;
	}
	Model.prototype.requestAJAX = function() {
		// create request
		this.xhr = new XMLHttpRequest();	
		// request settings
		this.xhr.open('GET', '/api/tasks.json', true);	
		// request start
		return this.xhr.send();
	};
	Model.prototype.getTemplate = function(category, template) {
		return server.templates[ category ][ template ];
	};
	Model.prototype.saveToLocalStorage = function( obj ) {
		var serializObj = JSON.stringify( obj );
		localStorage.setItem( this.localStorageKey, serializObj );
	};
	Model.prototype.takeFromLocalStorage = function() {
		return JSON.parse( localStorage.getItem( this.localStorageKey ) );
	};
	//////////////////////////////////////
	//////////////// VIEW ////////////////
	//////////////////////////////////////

	function View ( appWrapper ) {
		this.appWrapper = appWrapper;
		this.mainTemplate = '';
	}
	View.prototype.insertString = function( place, data ) {
		place.innerHTML += data;
	};
	View.prototype.MSTemplate = function( template ) {
		return Mustache.render( template );
	};
	View.prototype.findPlace = function( placeName ) {
		return this.appWrapper.querySelectorAll( placeName )[ 0 ];
	};
	View.prototype.addNewClassName = function( elem, className ) {
		elem.className += className;
	};

	////////////////////////////////////////
	//////////// CONTROLLER ////////////////
	////////////////////////////////////////

	function Controller ( rootScope ) {
		this._rootScope = rootScope;
	}
	Controller.prototype.init = function() {
		var self = this;

		// launching of request 
		this.model.requestAJAX();
		// request passing
		this.model.xhr.onreadystatechange = function() {
			// 4 - it's request DONE
			if (self.model.xhr.readyState != 4) {
				console.log('hi 1');
				return;
			}
			if (self.model.xhr.status != 200) {
				// handle errors
				self.fillArray();
				alert( self.model.xhr.status + ': ' + self.model.xhr.statusText );
			} else {
			    try {
			    	var infoFromServer = JSON.parse(self.model.xhr.responseText);
			    } catch (e) {
			    	alert( "Incorrect answer " + e.message );
			    }
			    self.transferInfoFromServer( infoFromServer );
			}
		};

		// pass template for view from model
		this.view.mainTemplate = this.model.getTemplate( 'views', 'main' );
		
		// deduce template to the page
		this.view.insertString( this.view.appWrapper, this.view.MSTemplate( this.view.mainTemplate ) );
		
		// pass function to _rootScope
		this._rootScope.events.init( 'addTask', [ self.addTask, self.renderTask ] );
		this._rootScope.events.init( 'clearList', [ self.clearList ] );
		this._rootScope.events.init( 'checked', [ self.checkedTask ] );
		this._rootScope.events.init( 'delete', [ self.deleteTask ] );
		this._rootScope.events.init( 'change', [ self.saveInputValue ] );
		
		// call functions from _rootScope
		this.initEvents();
	};
	Controller.prototype.transferInfoFromServer = function( infoFromServer ) {
		var self = this;
		self.model.infoFromServer = infoFromServer;
		self.fillArray();
	};
	Controller.prototype.fillArray = function() {
		var self = this;
		
		if ( localStorage.getItem( self.model.localStorageKey ) ) {
			var bufferLS = self.model.takeFromLocalStorage();
			var dateKeyBufferLS,
				ln1 = bufferLS.length,
				ln2 = self.model.infoFromServer.length;

			for ( var i = 0; i < ln2; i++ ) {
				var sum = 0;			
				var dateKeyFromServer = parseInt( self.model.infoFromServer[ i ].dateKey );
				
				for ( var j = 0; j < ln1; j++ ) {
					dateKeyBufferLS = bufferLS[ j ].dateKey;
					sum += ( dateKeyBufferLS - dateKeyFromServer );
				}
				
				if ( sum = 0 ) {
					self.model.tasks.push( self.model.infoFromServer[ j ] );
				}

			}

			for ( var j = 0; j < ln1; j++ ) {
				self.model.tasks.push( bufferLS[ j ] );
			}
			
		} else {
			self.model.tasks = self.model.infoFromServer;
		}
		self.model.saveToLocalStorage( self.model.tasks );
		self.renderTask( self );
	};
	Controller.prototype.renderTask = function( scope ) {
		var self = scope;
		self.view.findPlace( '#taskList' ).innerHTML = '';
		for ( var i = 0; i < self.model.tasks.length; i++) {
			var taskObject = self.model.tasks[ i ];
			self.createTask( taskObject, i, taskObject );
		}
	};
	Controller.prototype.addTask = function( scope, taskObject ) {
		var self = scope;
		self.model.tasks.push( taskObject );
		self.model.saveToLocalStorage( self.model.tasks );
		self.renderTask( self );
	};
	Controller.prototype.createTask = function( taskObject, i, checked ) {
		var self = this;
		var template = self.model.getTemplate( 'task', 'main' );
		this["task"+i] = new Task( self._rootScope, self.view.findPlace( '#taskList' ), i, taskObject, template );
	};
	Controller.prototype.checkedTask = function( scope, taskObject, dataId ) {
		var self = scope;
		if ( self.model.tasks[ dataId ].checked == true ) {
			self.model.tasks[ dataId ].checked = false;
		} else {
			self.model.tasks[ dataId ].checked = true;
		}
		self.model.saveToLocalStorage( self.model.tasks );
		self.renderTask( self );
	};
	Controller.prototype.deleteTask = function( scope, taskObject, dataId ) {
		var self = scope;
		self.model.tasks.splice( [ dataId ], 1);
		self.model.saveToLocalStorage( self.model.tasks );
		self.renderTask( self );
	};
	Controller.prototype.saveInputValue = function( scope, taskObject, dataId, target ) {
		var self = scope;
		self.model.tasks[ dataId ].task = target.value;
		self.model.saveToLocalStorage( self.model.tasks );
	};
	Controller.prototype.clearList = function( scope ) {
		var self = scope;
		self.model.tasks.splice( 0, self.model.tasks.length );
		localStorage.clear();
		self.renderTask( self );
	};
	Controller.prototype.initEvents = function() {
		var self = this;

		// scope - it's field of view (scope) that is passed to the called function from _rootScope
		var scope = this;

		this.view.appWrapper.addEventListener('click', function( event ) {
			var target = event.target;
			var eventName = target.getAttribute('data-action');
			if ( !eventName == 'checked') {
				event.preventDefault ? event.preventDefault() : event.returnValue = false;
			}
			var dataId = target.getAttribute('data-id');

			if ( eventName ) {
				var dateKey = new Date().valueOf();
				// it's object for model tasks array
				var taskObject = {
					"dateKey": dateKey,
					"task": '',
					"checked": false
				}

				if ( dataId ) {
					self._rootScope.events.emit( scope, eventName, taskObject, dataId );
				} else {
					self._rootScope.events.emit( scope, eventName, taskObject );
				}
			}

		}, false );
		this.view.appWrapper.addEventListener('keyup' || 'onchange', function( event ) {
			event.preventDefault ? event.preventDefault() : event.returnValue = false;
			var target = event.target;
			var eventName = target.getAttribute('data-change');
			var dataId = target.getAttribute('data-id');

			if ( eventName && dataId ) {
				var data;
				self._rootScope.events.emit( scope, eventName, data, dataId, target );
			}

		}, false );
	};
	//////////////////////////////////////
	//////////////// APP /////////////////
	//////////////////////////////////////

	function App( appName, appWrapper ) {
		var self = this;
		this.appName = appName ? appName : "appName";

		// the place where we will download app
		this.appWrapper = appWrapper ? appWrapper : document.getElementById( 'appWrapper' );

		// common object visibility. event storage
		this._rootScope = {
			events: {
				eventsBox: {},
				init: function( eventName, func) {
					var self = this;
					if ( !self.eventsBox.hasOwnProperty( eventName ) ) {
						self.eventsBox[ eventName ] = [ ];
						self.eventsBox[ eventName ].push( func );
					} else {
						self.eventsBox[ eventName ].push( func );
					}
				},
				emit: function( scope, eventName, data, dataId, target ) {
					var self = this;

					for (var i = 0; i < self.eventsBox[ eventName ].length; i++) {
						var arrayOfEventsFunc = self.eventsBox[ eventName ][ i ];
						for (var j = 0; j < arrayOfEventsFunc.length; j++ ) {
							// scope - it's field of view (scope) that is passed to the called function from _rootScope
							arrayOfEventsFunc[ j ]( scope, data, dataId, target );
						}
					}
				}
			}
		};

		// create: model, view, controller
		this.model = new Model( this.appName );
		this.controller = new Controller( this._rootScope );
		this.view = new View( this.appWrapper );

		// controller knows about the model and view
		this.controller.model = this.model;
		this.controller.view = this.view;

		// start app
		self.controller.init();
	}

	function Task( rootScope, place, i, taskObject, template ) {
		var self = this;

		this.place = place;
		this._rootScope = rootScope;
		this.taskId = i;
		this.taskObject = taskObject;
		this.mainTemplate = template;
		
		this.init();
	}
	Task.prototype.init = function() {
		this.render();
	};
	Task.prototype.render = function() {
		var checked;

		if ( this.taskObject.checked == true ) {
			checked = 'checked';
		} else { 
			checked = '';
		}

		var rendered = Mustache.render( this.mainTemplate, {
			taskId: this.taskId, 
			value: this.taskObject.task,
			checked: checked
		});

		this.place.innerHTML += rendered;
	};

	///////////////////////////////////////////////
	////////////////// LAUNCH APP /////////////////
	///////////////////////////////////////////////

	// at the start of application passed to him 2 arguments:
	// 	1) the application name (as a string);
	// 	2) an element in which to load.
	var app = new App("app");


	// try to add more App =)))

	// var app1 = new App("app1", document.getElementById( 'appWrapperr' ) );
	// var app2 = new App("app2", document.getElementById( 'appWrapperrr' ) );