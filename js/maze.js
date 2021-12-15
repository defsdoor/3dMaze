  // Some constants for getting around
  
  var BLOBS = 1000;
  var NORTH =  0;
  var EAST  =  1;
  var SOUTH =  2;
  var WEST =   3;
  var NODIR = -1;
  var ENDOFGEN=-2;

  var UNTROD = 0;

  var OFFSETS = [ { x: 0, y: 1}, 
                  { x: 1, y: 0}, 
                  { x: 0, y: -1}, 
                  { x: -1, y: 0} ];

  var OPPOSITES = [ SOUTH, WEST, NORTH, EAST ];

  var BITS = [ 1, 2, 4, 8 ];

  var TILESIZE = 8;

  var COLOURS = [ 0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0x00ffff, 0xff00ff ];
  var LEFTY=-1;
  var RIGHTY=1;
  var MOVING=0;
  var DYING=1;
  var SPAWNING=2;
  var DEAD=3;
  var TURNING=4;
  var ROTATE_MULTIPLIER=3

  var creating;

  function Maze(options) {
    this.size = { x: 50, y: 50}
    this.scene = options.scene
    this.size.x = options.width
    this.size.y = options.height
    this.tile_size = options.tile_size
    this.created = false;
    this.initialiseBoard();
//    this.makeStartPassage();

    var creator = new Creator( this );
    this.creator = creator
    creator.placeRandom();
    creator.moveStack.push(ENDOFGEN);

    var self = this;
    var tick = function() {
      self.plotBlobs();
      requestAnimationFrame(tick);
    };
    this.tick = tick;

  };

  Maze.prototype = {
    go: function() {
      this.blobs = this.createBlobs(BLOBS);
      this.tick();
    },
    createBlobs: function(qty) {
      var blobs = [];
      for (var n=0; n<qty; n++) {
        blobs.push( new Blob(this) );
      }
      blobs[0].colour = '#000000';
      blobs[0].speed = 1;
      this.killer = blobs[0];
      return( blobs );
    },
    plotBlobs: function() {
      for (n=0;n<this.blobs.length;n++) {
        this.blobs[n].erase();
        this.blobs[n].action();
        this.blobs[n].plot();
      }
    },
    create: function() {
      if (!this.created) {
        if (this.creator.tryToMove()==NODIR ) {
          var lastDir = this.creator.moveStack.pop();
          if (lastDir == ENDOFGEN) this.created = true;
          else {
            var newpos = this.creator.move( OPPOSITES[ lastDir ] );
            this.creator.setPosition( newpos.x, newpos.y );
          }
        }
      }
      return( this.created );
    },
    initialiseBoard: function() {
      this.board = new Array( this.size.x );

      for (var x=0; x<this.size.x; x++) {
        this.board[x] = new Array( this.size.y );
        for (var y=0;y<this.size.y; y++) {
          this.board[x][y] = UNTROD;
        }
      }
    },
    makeStartPassage: function() {
      this.board[0][0]=BITS[NORTH];
      this.drawTile(0,0);
      this.board[0][this.size.y - 1]=BITS[SOUTH] + BITS[EAST];
      this.drawTile(0,this.size.y-1);
      for (var y=1; y<this.size.y-1; y++) {
        this.board[0][y]=BITS[NORTH]+BITS[SOUTH];
        this.drawTile(0,y);
      }
    },
    drawTile: function(x,y) {
      var tile = this.board[x][y];
      var xpos = x * this.tile_size;
      var ypos = (this.size.y - y -1) * TILESIZE;
      this.drawWall( xpos, ypos, TILESIZE, 1, tile & BITS[NORTH] );
      this.drawWall( xpos + TILESIZE, ypos, 1, TILESIZE, tile & BITS[EAST] );
      this.drawWall( xpos + TILESIZE, ypos + TILESIZE, -TILESIZE, 1, tile & BITS[SOUTH] );
      this.drawWall( xpos, ypos + TILESIZE, 1, -TILESIZE, tile & BITS[WEST] );
    },
    drawWall: function(fx, fy, tx, ty, pres) {
      // this.mazeCtx.beginPath();
     //  this.mazeCtx.lineWidth = 1;
 //     this.screen.moveTo(fx, fy);
//      this.screen.lineTo(fx+tx,fy+ty);
    //   if (!pres )
   //      this.mazeCtx.fillRect(fx,fy, tx, ty);
  //    this.screen.stroke();
    }

  }

  function Blob(maze, scene) {
    this.maze = maze
    this.scene = scene
    this.position = { x:0, y:0 };
    this.spawn();
  }

  Blob.prototype= {
    spawn: function(options={}) {
      this.mode = MOVING;
      this.position.x = Math.floor( Math.random() * this.maze.size.x ) * this.maze.tile_size;
      this.position.y = Math.floor( Math.random() * this.maze.size.y ) * this.maze.tile_size;
      this.colour = options.colour || COLOURS[ Math.floor( Math.random() * COLOURS.length )];
      this.speed = Math.random() + 0.1
      this.rotation_speed = this.speed * 6
      this.direction = EAST;
      this.turning_from = this.rotations(this.direction)
      this.counter = 1;
      this.board = this.getBoardCoords( this.position.x, this.position.y );
      this.moving_to = { x: this.board.x * this.maze.tile_size, y: this.board.y * this.maze.tile_size }
      const geometry = new THREE.BoxGeometry( this.maze.tile_size * 0.30, this.maze.tile_size * 0.30, this.maze.tile_size * 0.30)
      const material = new THREE.MeshBasicMaterial( { color: this.colour } )
      this.cube = new THREE.Mesh( geometry, material );
      this.scene.add( this.cube )
      if (Math.random()>0.5) this.type = LEFTY;
      else this.type = RIGHTY;
    },
    plot: function() {
      this.cube.position.x = this.position.x
      this.cube.position.z = -this.position.y
      this.cube.rotation.y = -THREE.Math.degToRad(this.turning_from)
    },
    erase: function() {
      this.maze.screen.clearRect(this.position.x + 1, (this.maze.size.y * this.maze.tile_size) - this.position.y - this.maze.tile_size + 1, this.maze.tile_size-1, this.maze.tile_size-1);
    },
    action: function() {
      if (this.mode == MOVING) {
        //        if (!this.timeToMove() ) return;
        if (this.atDestination()) {
          var current_direction = this.direction
          this.board = this.getBoardCoords( this.position.x, this.position.y );
          if (!this.shouldTurn( this.board.x, this.board.y )) {
            this.direction = this.aboutTurn( this.board.x, this.board.y, this.direction, this.type);
            this.head_off( this.direction )
          }
            if ( this.direction != current_direction) {
              this.turning_from = this.rotations( current_direction )
              this.mode = TURNING
              this.turning_to = this.rotations(this.direction)
              if (current_direction - this.direction == 1 || current_direction - this.direction == -3) {
                this.turning_direction = -this.rotation_speed
              } else if (current_direction - this.direction == -1 || current_direction - this.direction == 3) {
                this.turning_direction = +this.rotation_speed
              } else {
                if (this.type == LEFTY) this.turning_direction = -this.rotation_speed
                else this.turning_direction = +this.rotation_speed
              }
            }
        }
        this.move();
      } else if (this.mode == TURNING ) {
        var was = this.turning_from
        this.turning_from = (this.turning_from + this.turning_direction ) % 360
        if (this.turning_from < 0) this.turning_from = 360 + this.turning_from
        var diff = Math.abs(this.turning_from - this.turning_to)
        if (diff <= Math.abs(this.turning_direction) * ROTATE_MULTIPLIER)  {
          this.mode = MOVING
          this.turning_from = this.turning_to
        }
      }
    },
    rotations: function(dir) {
      if (dir == 0) return(0)
      if (dir == 1) return(90)
      if (dir == 2) return(180)
      return(270)
    },
    head_off: function(to) {
      this.moving_to = { x: (this.board.x + OFFSETS[to].x) * this.maze.tile_size, y: (this.board.y + OFFSETS[to].y) * this.maze.tile_size }
    },
    move: function() {
      this.position.x += OFFSETS[this.direction].x * this.speed;
      this.position.y += OFFSETS[this.direction].y * this.speed;
    },
    aboutTurn: function( x, y, dir, type) {
      while ( (this.maze.board[x][y] & BITS[dir]) == 0) {
        dir = this.rotate(dir, -type);
      }
      return(dir);
    },
    getBoardCoords: function( x, y)  {
      var nx = Math.floor( x / this.maze.tile_size );
      var ny = Math.floor( y / this.maze.tile_size );
      return( { x: nx, y: ny } );
    },
    shouldTurn: function( x, y) {
      var newdir = this.rotate(this.direction, this.type);
      if ( ( this.maze.board[x][y] & BITS[newdir]) != 0) {
        this.direction = newdir;
        this.head_off( this.direction )
        return(true);
      } else return(false);
    },
    atDestination: function() {
      if (this.direction == NORTH && this.position.y >= this.moving_to.y) {
        this.position.y = this.moving_to.y
      }
      else if (this.direction == EAST && this.position.x >= this.moving_to.x) {
        this.position.x = this.moving_to.x
      }
      else if (this.direction == SOUTH && this.position.y <= this.moving_to.y) {
        this.position.y = this.moving_to.y
      }
      else if (this.direction == WEST && this.position.x <= this.moving_to.x) {
        this.position.x = this.moving_to.x
      } else {
        return(false)
      }
      return(true)
    },
    timeToMove: function() {
      this.counter--;
      if (this.counter--) {
        this.counter = this.speed;
        return(true);
      }
      return(false);
    },
    rotate: function(d, a) {
      d = d + a;
      if (d==-1) return(3);
      if (d==4) return(0);
      return(d);
    }

  }

  var Creator = function(maze) {
    this.position = { x: 0, y: 0 };
    this.maze = maze;
    this.board = maze.board;
    this.pathSelector = new PathSelector;
    this.pathSelector.randomise();
    this.moveStack = new Array;
  }

  Creator.prototype = {
    placeRandom: function() {
      do {
        this.position.x = Math.floor( Math.random() * this.maze.size.x );
        this.position.y = Math.floor( Math.random() * this.maze.size.y );
      } while (this.board[this.position.x][this.position.y] != UNTROD);
    },

    logPosition: function() {
      console.log( "x: " + this.position.x + " y: " + this.position.y + " Dirs: " + this.pathSelector.directions );
    },

    tryToMove: function() {
      this.pathSelector.reset();
      do {
        var dir = this.pathSelector.getDirection();
        if (dir==NODIR) break;

        var newPosition = this.move( dir );
        if ( this.inBounds(newPosition.x, newPosition.y) && this.board[newPosition.x][newPosition.y] == UNTROD ) {
          this.moveStack.push(dir);
          this.walk(dir, newPosition);
          break;
        }
      } while (dir != NODIR );
      return( dir );
    },
    move: function(direction) {
      var x = this.position.x + OFFSETS[direction].x;
      var y = this.position.y + OFFSETS[direction].y;
      return( { x: x, y: y } );
    },
    inBounds: function(x, y) {
      return(x>=0 && x<this.maze.size.x && y>=0 && y<this.maze.size.y);
    },
    setPosition: function(x,y) {
      this.position.x = x;
      this.position.y = y;
    },
    walk: function( dir, to ) {
      this.carveFrom( dir );
      this.setPosition( to.x, to.y);
      this.carveTo( dir );
    },
    carveFrom: function(dir) {
      this.board[this.position.x][this.position.y] |= BITS[dir];
      this.maze.drawTile(this.position.x, this.position.y);
    },
    carveTo: function(dir) {
      this.board[this.position.x][this.position.y] |= BITS[OPPOSITES[dir]];
      this.maze.drawTile(this.position.x, this.position.y);
    }
  };

  var PathSelector = function() {
    this.directions = [ NORTH, EAST, SOUTH, WEST ];
    this.tries = 0;
  };

  PathSelector.prototype = {
    reset: function() {
      this.tries = 0;
      this.randomise();
    },

    randomise: function() {
      var tmp, swap;
      for(var n=0; n<=3; n++) {
        tmp = this.directions[n];
        swap = Math.floor( Math.random() * 4);
        this.directions[n] = this.directions[ swap ];
        this.directions[swap] = tmp;
      }
    },

    getDirection: function() {
      if (this.tries == 4) return( NODIR );
      return( this.directions[ this.tries++ ]);
    },

  };

