//--------------------------------------------------------------------
// Flappy
//--------------------------------------------------------------------

import {Program} from "../runtime/dsl2";
import "../watchers/system";
import {v4 as uuid} from "node-uuid";
import {PerformanceReporter} from "./perfReport";

//--------------------------------------------------------------------
// Utils
//--------------------------------------------------------------------

function toEAVs(eavs:any[], obj:any) {
  let record = uuid();
  for(let attribute in obj) {
    let values = obj[attribute];
    if(values.constructor === Array) {
      for(let value of values) {
        eavs.push([record, attribute, value]);
      }
    } else {
      eavs.push([record, attribute, values]);
    }
  }
  return eavs;
}

//--------------------------------------------------------------------
// Program
//--------------------------------------------------------------------

let prog = new Program("flappy");
prog.attach("system");
prog.attach("svg");
prog.attach("html");

//--------------------------------------------------------------------
// Draw the game world
//--------------------------------------------------------------------

prog.commit("draw the game world", ({find, record}) => {
  let world = find("world");
  return [
    world.add("tag", "html/div")
         .add("style", record("html/style", {"user-select":"none"}))
         .add("children", [
           record("svg", "game-window", {viewBox: "10 0 80 100", width:480}).add("children", [
             record("svg/rect", {x:0, y:0, width:100, height:53, fill:"rgb(112,197,206)", sort:0}),
             record("svg/rect", {x:0, y:95, width:100, height:5, fill:"rgb(222,216,149)", sort:0}),
             record("svg/image", {x:0, y:52, width:100, height:43, sort:1,preserveAspectRatio:"xMinYMin slice", href:"https://cdn.rawgit.com/bhauman/flappy-bird-demo/master/resources/public/imgs/background.png"}),
           ])
         ])
  ]
})

//--------------------------------------------------------------------
// menu screens
//--------------------------------------------------------------------

prog.block("draw the main menu", ({find, record}) => {
  find("world", {screen:"menu"})
  let svg = find("game-window");
  return [
    svg.add("children", record("svg/text", {x:50, y:45, text:"Click the screen to begin!", sort:10, "font-size":6, "text-anchor":"middle"}))
  ]
});

prog.block("draw the game over menu", ({find, record}) => {
  let {score, best} = find("world", {screen:"game over"});
  let svg = find("game-window");
  return [
    svg.add("children", [
      record("svg/text", {x:50, y:30, "text-anchor":"middle", "font-size":6, text:"Game Over :(", sort: 10}),
      record("svg/text", {x:50, y:55, "text-anchor":"middle", "font-size":6, text:`Score ${score}`, sort: 11}),
      record("svg/text", {x:50, y:65, "text-anchor":"middle", "font-size":6, text:`Best ${best}`, sort: 12}),
      record("svg/text", {x:50, y:85, "text-anchor":"middle", "font-size":4, text:"Click to play again!", sort: 13})
    ])
  ]
})

//--------------------------------------------------------------------
// Score
//--------------------------------------------------------------------

prog.block("calculate the score", ({find, record, lib}) => {
  let {math} = lib;
  let world = find("world")
  return [
    world.add("score", math.floor(world.distance))
  ]
});

//--------------------------------------------------------------------
// Start the game
//--------------------------------------------------------------------

prog.commit("clicking starts the game", ({find, record, lib, choose}) => {
  let {math} = lib;
  let world = find("world");
  let svg = find("game-window");
  // find("html/event/click", {element:svg});
  find("html/event/click", "html/direct-target");

  choose(() => { world.screen == "menu" },
         () => { world.screen == "game over"});

  let bestScore = math.max(world.score, world.best);
  let player = find("player");
  return [
    world.remove("screen").add("screen", "game")
         .remove("distance").add("distance", 0)
         .remove("best").add("best", bestScore),
    player.remove("x").add("x", 25)
          .remove("y").add("y", 50)
          .remove("velocity").add("velocity", 0)
  ]
});

//--------------------------------------------------------------------
// Draw the player
//--------------------------------------------------------------------

prog.block("draw the player", ({find, record}) => {
  let svg = find("game-window");
  let player = find("player");
  return [
    svg.add("children",[
      record("svg/image", {player, width:10, height:10, sort:8, href:"http://i.imgur.com/sp68LtM.gif"})
        .add("x", player.x - 5)
        .add("y", player.y - 5)
    ])
  ]
});

//--------------------------------------------------------------------
// Obstacles
//--------------------------------------------------------------------

prog.block("draw obstacles", ({find, record}) => {
  let svg = find("game-window");
  let obstacle = find("obstacle");
  let {height, gap} = obstacle;
  let bottomHeight = height + gap;
  let imgs = "https://cdn.rawgit.com/bhauman/flappy-bird-demo/master/resources/public/imgs";
  return [
    svg.add("children", [
      record("svg", "obs-spr", {obstacle, sort:2, overflow:"visible"}).add("children", [
        record("svg/image", {x:0, y:0, width:10, height, preserveAspectRatio:"none", href:`${imgs}/pillar-bkg.png`, sort:1}),
        record("svg/image", {x:-1, y:height - 5, width:12, height:5, preserveAspectRatio:"none", href:`${imgs}/lower-pillar-head.png`, sort:2}),
        record("svg/image", {x:0, y:bottomHeight, width:10, height:90 - bottomHeight, preserveAspectRatio:"none", href:`${imgs}/pillar-bkg.png`, sort:1}),
        record("svg/image", {x:-1, y:bottomHeight, width:12, height:5, preserveAspectRatio:"none", href:`${imgs}/lower-pillar-head.png`, sort:2}),
      ])
      .add("x", obstacle.x)
    ])
  ]
})

prog.block("every 2 distance, a wild obstacle appears", ({find, lib: {math}}) => {
  let {distance} = find("world");
  let obstacle = find("obstacle");
  let obstacleDistance = distance + obstacle.offset;
  obstacleDistance >= 0;
  let prex = 50 * math.mod(obstacleDistance, 2);
  let x = 100 - prex;

  return [
    obstacle.add("x", x)
  ]
});

// @TODO: What's the deal with airline food?
prog.commit("adjust the height of the gap", ({find, lib: {math, random}}) => {
  let {frame} = find("frames");
  let world = find("world", {screen: "game"});
  frame != world.frame;
  let obstacle = find("obstacle");
  obstacle.x > 90;
  let height = random.number(frame) * 30 + 5;
  return [obstacle.remove('height').add("height", height)];
})

//--------------------------------------------------------------------
// Flapping the player
//--------------------------------------------------------------------

prog.commit("apply a velocity when you click", ({find}) => {
  let world = find("world", {screen:"game"})
  find("html/event/click", "html/direct-target")
  let player = find("player", "self");
  return [
    player.remove("velocity").add("velocity", 1.17)
  ]
})

//--------------------------------------------------------------------
// Scroll the world
//--------------------------------------------------------------------

prog.commit("scroll the world", ({find, not}) => {
  let {frame} = find("frames");
  let world = find("world", {screen:"game"});
  frame != world.frame
  let player = find("player");
  let adjust = 1 / 30;
  not(() => { find("html/event/click") })

  return [
    world.remove("frame").add("frame", frame)
         .remove("distance").add("distance", world.distance + adjust),
    player.remove("y").add("y", player.y - player.velocity)
          .remove("velocity").add("velocity", player.velocity + world.gravity)
  ]
});

//--------------------------------------------------------------------
// Collision
//--------------------------------------------------------------------

prog.commit("collide with ground", ({find}) => {
  let world = find("world", {screen: "game"});
  let player = find("player");
  player.y > 85; // ground height + player radius

  return [
    world.remove("screen", "game").add("screen", "game over")
  ];
});

// Hangs due to union/choose
prog.commit("collide with obstacle", ({find, choose, lib: {math}}) => {
  let world = find("world", {screen: "game"});
  let player = find("player");
  let obstacle = find("obstacle");
  let dx = math.abs(obstacle.x + 5 - player.x) - 10
  dx < 0;

  choose(
    () => {player.y - 5 <= obstacle.height},
    () => {player.y + 5 >= obstacle.gap + obstacle.height});

  return [
    world.remove("screen", "game").add("screen", "game over")
  ];
})

//--------------------------------------------------------------------
// svg/html translation
//--------------------------------------------------------------------

prog
  .block("Translate elements into html", ({find, record, union}) => {
    let elem = find("html/div");
    return [elem.add("tag", "html/element").add("tagname", "div")];
  })

prog
  .block("Translate elements into svg", ({find, record, union}) => {
    let elem = find("svg");
    return [elem.add("tag", "svg/element").add("tagname", "svg")];
  })
  .block("Translate elements into svg", ({find, record, union}) => {
    let elem = find("svg/rect");
    return [elem.add("tag", "svg/element").add("tagname", "rect")];
  })
  .block("Translate elements into svg", ({find, record, union}) => {
    let elem = find("svg/text");
    return [elem.add("tag", "svg/element").add("tagname", "text")];
  })
  .block("Translate elements into svg", ({find, record, union}) => {
    let elem = find("svg/image");
    return [elem.add("tag", "svg/element").add("tagname", "image")];
  });

//--------------------------------------------------------------------
// Go!
//--------------------------------------------------------------------

let changes:any[] = [];
toEAVs(changes, {tag:["frames", "system/timer"], resolution:33.333333333333})
toEAVs(changes, {tag:["player", "self"], name:"eve", x:25, y:50, velocity:0})
toEAVs(changes, {tag:"world", screen:"menu", frame:0, distance:0, best:0, gravity:-0.061})
toEAVs(changes, {tag:"obstacle", gap:35, offset:0})
toEAVs(changes, {tag:"obstacle", gap:35, offset:-1})

// console.profile("flappy");
prog.inputEavs(changes);

// prog.inputEavs([["meep", "tag", "frames"], ["meep", "frame", 1]])
// prog.inputEavs(toEAVs([], {tag: ["html/event/click", "html/direct-target"]}));
// prog.inputEavs([["meep", "frame", 2], ["meep", "frame", 1, -1]])
// prog.inputEavs([["meep", "frame", 3], ["meep", "frame", 2, -1]])
// prog.inputEavs(toEAVs([], {tag: ["html/event/click", "html/direct-target"]}));
// prog.inputEavs([["meep", "frame", 4], ["meep", "frame", 3, -1]])
// prog.inputEavs([["meep", "frame", 5], ["meep", "frame", 4, -1]])
// prog.inputEavs(toEAVs([], {tag: ["html/event/click", "html/direct-target"]}));
// prog.inputEavs([["meep", "frame", 6], ["meep", "frame", 5, -1]])
// prog.inputEavs([["meep", "frame", 7], ["meep", "frame", 6, -1]])
// prog.inputEavs([["meep", "frame", 8], ["meep", "frame", 7, -1]])
// for(let ix = 9; ix < 60; ix++) {
//   prog.inputEavs([["meep", "frame", ix], ["meep", "frame", ix-1, -1]])
//   prog.inputEavs(toEAVs([], {tag: ["html/event/click", "html/direct-target"]}));
// }
// for(let ix = 60; ix < 100; ix++) {
//   prog.inputEavs([["meep", "frame", ix], ["meep", "frame", ix-1, -1]])
// }
//   prog.inputEavs(toEAVs([], {tag: ["html/event/click", "html/direct-target"]}));
// // for(let ix = 100; ix < 200; ix++) {
// //   prog.inputEavs([["meep", "frame", ix], ["meep", "frame", ix-1, -1]])
// // }
// console.profileEnd();

// let reporter = new PerformanceReporter();
// reporter.report(prog.context.tracker);
console.log(prog);