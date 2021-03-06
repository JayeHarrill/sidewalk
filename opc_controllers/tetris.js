// Tetris code is lightly modified from original (unlicenced) code
// from the url below.
// http://charlesleifer.com/blog/even-more-canvas-fun-tetris-in-javascript/

// var score_callback = function (score, lines, level) {
//   console.log("score: " + score.toString());
// };

var npm_opc = require("./opc_init.coffee")

var WIDTH = npm_opc.width
var HEIGHT = npm_opc.height
var strand = npm_opc.strand
var columns = npm_opc.columns
var stream = npm_opc.stream
var intervalObj = []
score_callback = function(sq, line, level){
	console.log("score updated", sq, line, level);
}

TETRIS = function Tetris(stream, strand, player, score_callback) {
    var width = WIDTH,
        height = HEIGHT,
        fill_r = 0,
        fill_g = 0,
        fill_b = 0,
        board_r = 0,
        board_g = 0,
        board_b = 0,
        board,
        pending_shape,
        active_shape,
        context,
        level,
        score,
        lines;

		if(player == "BLUE"){ fill_b = 255}
		if(player == "RED"){ fill_r = 255}

    var BLOCK_EMPTY = 0,
        BLOCK_FULL = 1,
        BLOCK_ACTIVE = 2;

    // keys
    var UP = 38, DOWN = 40, LEFT = 37, RIGHT = 39;

    function Shape() {
      var self = this;

      var shapes = [
        [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
        [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
        [[0, 0, 0, 0], [0, 1, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0]],
        [[0, 0, 0, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 1, 1, 0]],
        [[0, 0, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 1, 0]],
        [[0, 0, 0, 0], [0, 0, 1, 0], [0, 1, 1, 0], [0, 1, 0, 0]],
        [[0, 0, 0, 0], [0, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 0]]
      ];

      this.rotate = function() {
        var new_shape = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];

        for (var j = 0; j < 4; j++)
          for (var i = 0; i < 4; i++) {
            new_shape[i][j] = self.shape[4 - j - 1][i];
          }

        self.shape = new_shape;
      }

      this.left_edge = function() {
        for (var x = 0; x < 4; x++)
          for (var y = 0; y < 4; y++)
            if (self.shape[y][x] == BLOCK_FULL)
              return x;
      }

      this.right_edge = function() {
        for (var x = 3; x >= 0; x--)
          for (var y = 0; y < 4; y++)
            if (self.shape[y][x] == BLOCK_FULL)
              return x;
      }

      this.bottom_edge = function() {
        for (var y = 3; y >= 0; y--)
          for (var x = 0; x < 4; x++)
            if (self.shape[y][x] == BLOCK_FULL)
              return y;
      }

      this.initialize = function() {
        var rotations = parseInt(Math.random() * 4),
            shape_idx = parseInt(Math.random() * shapes.length);

        // grab a random shape
        self.shape = shapes[shape_idx];

        // rotate it a couple times
        for (var i = 0; i < rotations; i++)
          self.rotate();
      }

      this.clone = function() {
        s = new Shape();
        s.x = self.x;
        s.y = self.y;
        s.shape = self.shape;
        return s;
      }
    }

    function reset() {
      board = [];
      for (var y = 0; y < height; y++) {
        var row = [];
        for (var x = 0; x < width; x++)
          row.push(0);
        board.push(row);
      }

      score = 0;
      lines = 0;
      level = 1;
      if (score_callback)
        score_callback(score, lines, level);

      pending_shape = new Shape();
      pending_shape.initialize();

      add_shape();
    }

    function add_shape() {
      active_shape = pending_shape;
      active_shape.x = parseInt(width / 2 - 2);
      active_shape.y = parseInt(height/2);

      pending_shape = new Shape();
      pending_shape.initialize();

      if (is_collision(active_shape))
        reset();
    }

    this.rotate_shape = function() {
      rotated_shape = active_shape.clone();
      rotated_shape.rotate();

      if (rotated_shape.left_edge() + rotated_shape.x < 0)
        rotated_shape.x = -rotated_shape.left_edge();
      else if (rotated_shape.right_edge() + rotated_shape.x >= width)
        rotated_shape.x = width - rotated_shape.right_edge() - 1;

      if (rotated_shape.bottom_edge() + rotated_shape.y > height)
        return false;

      if (!is_collision(rotated_shape))
        active_shape = rotated_shape;
    }

    this.move_left = function () {
      active_shape.x--;
      if (out_of_bounds() || is_collision(active_shape)) {
        active_shape.x++;
        return false;
      }
      return true;
    }

    this.move_right = function () {
      active_shape.x++;
      if (out_of_bounds() || is_collision(active_shape)) {
        active_shape.x--;
        return false;
      }
      return true;
    }

    this.move_down = function () {
      active_shape.y++;
      if (check_bottom() || is_collision(active_shape)) {
        active_shape.y--;
        shape_to_board();
        add_shape();
        return false;
      }
      return true;
    }

    function out_of_bounds() {
      if (active_shape.x + active_shape.left_edge() < 0)
        return true;
      else if (active_shape.x + active_shape.right_edge() >= width)
        return true;
      return false;
    }

    function check_bottom() {
      return (active_shape.y + active_shape.bottom_edge() >= height);
    }

    function is_collision(shape) {
      for (var y = 0; y < 4; y++)
        for (var x = 0; x < 4; x++) {
          if (y + shape.y < 0)
            continue;
          if (shape.shape[y][x] && board[y + shape.y][x + shape.x])
            return true;
        }
      return false;
    }

    function test_for_line() {
      for (var y = height - 1; y >= 0; y--) {
        var counter = 0;
        for (var x = 0; x < width; x++)
          if (board[y][x] == BLOCK_FULL)
            counter++;
        if (counter == width) {
          process_line(y);
          return true;
        }
      }
      return false;
    }

    function process_line(y_to_remove) {
      lines++;
      score += level;
      if (lines % 10 == 0)
        level++;

      for (var y = y_to_remove - 1; y >= 0; y--)
        for (var x = 0; x < width; x++)
          board[y + 1][x] = board[y][x];

      if (score_callback)
        score_callback(score, lines, level);
    }

    function shape_to_board() {
      // transpose onto board
      for (var y = 0; y < 4; y++)
        for (var x = 0; x < 4; x++) {
          var dx = x + active_shape.x,
              dy = y + active_shape.y;
          if (dx < 0 || dx >= width || dy < 0 || dy >=height)
            continue;
          if (active_shape.shape[y][x] == BLOCK_FULL)
            board[dy][dx] = BLOCK_FULL;
        }

      var lines_found = 0;
      while (test_for_line())
        lines_found++;

      return lines_found;
    }

    function move_piece(motion) {
      if (motion == LEFT)
        move_left();
      else if (motion == RIGHT)
        move_right();
      else if (motion == UP)
        rotate_shape();
      else if (motion == DOWN)
        move_down();
    }

		this.draw_game_board = function() {
		      for (var y = parseInt(height/2); y < height; y++)
		        for (var x = 0; x < width; x++)
		          draw_block(x, y, board_r, board_g, board_b);

		      for (var y = parseInt(height/2); y < height; y++)
		        for (var x = 0; x < width; x++)
		          if (board[y][x] == BLOCK_FULL || board[y][x] == BLOCK_ACTIVE){
		            draw_block(x, y, fill_r, fill_g, fill_b);
							}
		      for (var y = 0; y < 4; y++)
		        for (var x = 0; x < 4; x++) {
		          var dx = x + active_shape.x,
		              dy = y + active_shape.y;
		          if (active_shape.shape[y][x] == BLOCK_FULL)
		            draw_block(dx, dy, fill_r, fill_g, fill_b);
		        }

		      stream.writePixels(0, strand.buffer);
		}

		function draw_block(x, y, r, g, b) {
			if(player == "RED"){
				y = y - parseInt(height/2)
			  columns[x].setPixel(y,r,g,b);
			}
			if(player == "BLUE"){
				y = Math.abs( y - 3*parseInt(height/2) ) - 1
				columns[x].setPixel(y,r,g,b);
			}
    }

    function handleKeys(e) {
      var k;
      var evt = (e) ? e : window.event;

      k = (evt.charCode) ?
        evt.charCode : evt.keyCode;
      if (k > 36 && k < 41) {
        move_piece(k);
        return false;
      };
      return true;
    }

    this.update_board = function() {
      this.move_down();
    }

    function initialize() {
      reset();
	  }
    initialize();
		return this
}

var RED = null
var BLUE = null

module.exports ={
	"init" : function(){
			redblue = [];
			BLUE = new TETRIS(stream, strand, "BLUE", score_callback);
			redblue.push(BLUE);
			RED = new TETRIS(stream, strand, "RED", score_callback);
			redblue.push(RED);
			intervalObj = setInterval( function(){
				RED.update_board();
				RED.draw_game_board();
				BLUE.update_board();
				BLUE.draw_game_board();}
			, 150 );
			return redblue
		},
	"breakInterval": function(){
		console.log(intervalObj)
		clearInterval(intervalObj);
	},
	"interval" : function(){
		return intervalObj;
	},
	"redMove" :  function(direction){
		switch(direction){
			case "LEFT":
				  RED.move_left();
					break;
			case "RIGHT":
					RED.move_right();
					break;
			case "DOWN":
					RED.move_down();
					break;
			case "ROTATE":
					RED.rotate_shape();
					break;
				} //switch
		},
	"blueMove" :  function(direction){
			switch(direction){
				case "LEFT":
					  BLUE.move_left();
						break;
				case "RIGHT":
						BLUE.move_right();
						break;
				case "DOWN":
						BLUE.move_down();
						break;
				case "ROTATE":
						BLUE.rotate_shape();
						break;
					} //switch
			},
} // export
