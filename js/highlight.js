
(function () {
	"use strict"
} )()

highlight = ( function () {
	/* global object for highlight.js (great name, huh?).
	  released under the GLP-3, copyright Ryan Grannell. */

		var StateMachine = function (states, outputs) {
			// returns a finite-state machine. 

			var that = {
				depth: 0,
				transitions: states,
				html_output_rules: outputs( this.depth )				
			}

			that.consume_token = function (token) {
				/* takes a single token, updates internal state if
				 the token caused a state -> state transition. returns a
				 pretty html string to the user. */

				var html_output = function (source, target, token) {
					/* takes a source state, target state and a token that
					 triggered the transition. returns a html string that
					 styles the input token. */

					var state_rules = that.html_output_rules[source][target]
					var html_string = token

					for (var candidate in state_rules) {
						if (!state_rules.hasOwnProperty(candidate)) {
							continue
						}
						if (candidate !== '*nomatch*' && candidate === token) {
							html_string = state_rules[candidate]
						}			
					}	
					return html_string
				}

				var change_delimiter_depth = function (source, target, depth) {
					// change r output depth based on transition

					var delimiter_opened = 
						(source === 'normal' && 
							target === 'open_delim') || 
						(source === 'open_delim' &&
							target === 'open_delim')
					
					var delimiter_closed = 
						(source === 'close_delim' &&
							target === 'normal') ||
						(source === 'close_delim' &&
							target === 'close_delim')

					if (delimiter_opened) {
						depth += 1
					} else if (delimiter_closed) {
						depth -= 1
					}

					that.depth = depth
					that.html_output_rules = html_output_rules(depth)

					return {
						"depth": depth, 
						"html_output_rules": html_output_rules(depth) 
					}
				}
				
				for (var transition in that.transitions) {
					if (!that.transitions.hasOwnProperty(transition)) {
						continue
					}

					if (that.transitions[transition].active) {
						var active = that.transitions[transition]
						var old_state = transition
					}
				}

				var new_state = active.edges['*nomatch*']

				for (var edge in active.edges) {
					if (!active.edges.hasOwnProperty(edge)) {
						continue
					}					
					if (token === edge) {
						new_state = active.edges[edge]
					}
				}

				that.transitions[old_state].active = false
				that.transitions[new_state].active = true
			
				change_delimiter_depth(old_state, new_state, that.depth)

				return html_output(old_state, new_state, token)

			}
			return that
		}

		var highlight_text = function (text) {
			/* given (presumably legal) R code as a single string, 
			 return a string of higlighted R code */

			var highlighted_code = ''
			var r_state_machine = StateMachine(
				r_transitions,
				html_output_rules
			)

			for (var ith = 0; ith < text.length; ith++) {
			
				var token = text.substring(ith, ith+1)
				highlighted_code = 
					highlighted_code + r_state_machine.consume_token(token)
			
			}

			return highlighted_code
		}
		
		var highlight_r_code = function () {
			/* alter all class = "r" tags in a html document,
			 returning code that can be targeted with css. */

			$('.r').replaceWith( function (index, content) {
				return '<code class = "r">' + 
					highlight_text($(this).text()) + 
				'</code>'
			} )

		}

		var r_transitions = ( function () {
			/* returns an object which contains objects - one for each possible state -
			 which contain an active field (is this the state we're currently on?) and 
			 edges: tokens that trigger a state change. 
	
			 {
				'state name' (1): {
					active (2) : true or false,
					edges (3): {
						"pattern" (4): 'state name',
						"*nomatch*" (5): 'state name'
					}
				},
				...
			 }
			  1: 'state'. an arbitrary string, one of several states a machine may occupy.
			      key is bound to an object described below.
			  
			  2: active. a boolean value, denoting whether the 
			      enclosing state is currently active.
			  
			  3: edges. an object containing pattern: newstate pairs. These pairs are
			      edges between state nodes on a graph, that are followed if the
			      pattern is matched exactly.
			  
			  4: "pattern". an arbitrary string. If an incoming token matches pattern
			      then the edge is followed.
			  
			  5: "*nomatch*": a special pattern inside each edges object; if no 
			      pattern matches the token, use the state name bound to this object.

			 */

			return {
				// singly-quoted string. 
				// can transition to normal state, or itself.

				'str_single': {
					'active': false,
					'edges': {
						"'": 'normal',
						'*nomatch*': 'str_single'
					}
				},
				// doubly-quoted string. 
				// can transition to normal state, or itself.

				'str_double': {
					'active': false,
					'edges': {
						'"': 'normal',
						'*nomatch*': 'str_double'
					} 
				},
				// normal
				// the starting state. transitions upon encountering 
				// delimiters, strings or comments

				'normal': {
					'active': true,
					'edges': {
						"'": 'str_single',
						'"': 'str_double',
						'#': 'comment',
						
						'(': 'open_delim',
						'[': 'open_delim',
						'{': 'open_delim',
						
						'}': 'close_delim',
						']': 'close_delim',
						')': 'close_delim',
						
						'*nomatch*': 'normal'
					}
				},
				// open delimiter
				// transitions upon encountering 
				// delimiters, strings or comments

				'open_delim': {
					'active': false,
					'edges': {
						"'": 'str_single',
						'"': 'str_double',
						'#': 'comment',
						
						'(': 'open_delim',
						'[': 'open_delim',
						'{': 'open_delim',
						
						'}': 'close_delim',
						']': 'close_delim',
						')': 'close_delim',
						
						'*nomatch*': 'normal'
					}
				},
				// close delimiter
				// transitions upon encountering 
				// delimiters, strings or comments

				'close_delim': {
					'active': false,
					'edges': {
						"'": 'str_single',
						'"': 'str_double',
						'#': 'comment',
						
						'(': 'open_delim',
						'[': 'open_delim',
						'{': 'open_delim',
						
						'}': 'close_delim',
						']': 'close_delim',
						')': 'close_delim',
						
						'*nomatch*': 'normal'
					}
				},
				// comment
				// comment state reverts to normal on newline.
				'comment': {
					'active': false,
					'edges': {
						'\n': 'normal',
						'*nomatch*': 'comment'
					}
				}
			}
		} )()


		var html_output_rules = function(depth) {
			/* generates an object describing state-state transitions for 
			 the R grammar highlighter each edge is associated with some html output.
			 The output is dependent on depth,
			 a global variable denoting how many depths nested the state machine
			 parsing this grammar currently is. */

			var span_open = function (css_class) {
				return '<span class="' + css_class + '">'
			}
			var span_close = function () {
				return '</span>'
			}
			var span = function (css_class, content) {
				return '<span class="' + css_class + '">' + content + '</span>'
			}

			var open_delim_output = function (depth) {

				return {
					'(': span('lev' + depth, '('),
					'[': span('lev' + depth, '['),
					'{': span('lev' + depth, '{')
				}
			}

			var close_delim_output = function (depth) {

				return {
					')': span('lev' + depth, ')'),
					']': span('lev' + depth, ']'),
					'}': span('lev' + depth, '}')
				}
			}

			var html_code_state = function (depth) {
				/* the html output associated with certain tokens
				 when in normal or delimiter states. */

				return {
					'str_single': {
						"'": span_open("sstring") + "'"
					},
					'str_double': {
						'"': span_open("dstring") + '"'
					},
					'normal': {
						'$': span('dollar', '$'),
						',': span('comma lev' + depth, ','),
						'*nomatch*': '*token*'
					},
					'comment': {
						'#': span_open('comment') + '#'
					},
					'open_delim': open_delim_output(depth),
					'close_delim': close_delim_output(depth)
				}
			}

			return {
				'str_single': {
					'str_single': {
						'"': span("ssdouble", '"'),
						'*nomatch*': '*token*'
					},
					'normal': {
						"'": "'" + span_close() 
					}
				},
				'str_double': {
					'str_double': {
						"'": span("dssingle", "'"),
						'*nomatch*': '*token*'
					},
					'normal': {
						'"': '"' + span_close()
					}
				},
				'normal': html_code_state(depth),
				'open_delim': html_code_state(depth),
				'close_delim': html_code_state(depth),
				'comment': {
					'normal': {
						'\n': '\n' + span_close()
					},
					'comment': {
						'*nomatch*': '*token*'
					}
				}
			}
		}


		return {
			StateMachine: StateMachine,
			highlight_text: highlight_text,
			highlight_r_code: highlight_r_code
		}

} )()



