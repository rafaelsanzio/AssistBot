var BrainJSClassifier = require('natural-brain');
var classifier = new BrainJSClassifier();
 
classifier.addDocument('20/07/2017', '20/08/2017');
classifier.addDocument('20/07/2017', '20/08/2017');
classifier.addDocument('20/07/2017', '20/08/2017');
classifier.addDocument('20/07/2017', '20/08/2017');
classifier.addDocument('20/07/2017', '20/08/2017');
classifier.addDocument('20/07/2017', '20/08/2017');
classifier.addDocument('tried the program, but it was buggy.', 'software');
classifier.addDocument('tomorrow we will do standup.', 'meeting');
classifier.addDocument('the drive has a 2TB capacity.', 'hardware');
classifier.addDocument('i need a new power supply.', 'hardware');
classifier.addDocument('can you play some new music?', 'music');

classifier.addDocument('Meu cavalo é show.', 'vaqueiro');
classifier.addDocument('André Balada e Diego Showza', 'sport');
classifier.addDocument('Pimpão e Roger farão os gols hoje', 'Botafogo');
 
classifier.train();
 
console.log(classifier.classify('hi'));

/*var brain = require('brain.js');
var net = new brain.recurrent.RNN();
 
net.train([{input: ['20/07/2017'], output: ['20/08/2017']},
           {input: ['21/07/2017'], output: ['21/08/2017']},
           {input: ['22/07/2017'], output: ['22/08/2017']},
           {input: ['23/07/2017'], output: ['23/08/2017']},
           {input: ['24/07/2017'], output: ['24/08/2017']},
           {input: ['25/07/2017'], output: ['25/08/2017']},
           {input: ['26/07/2017'], output: ['26/08/2017']},
           {input: ['27/07/2017'], output: ['27/08/2017']}]);
 
var output = net.run(['19/07/2017']);  // [0] 
console.log(output);*/