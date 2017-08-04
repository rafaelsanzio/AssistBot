//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');
var request = require('request');
var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var bodyParser = require('body-parser');
var dateFormat = require('dateformat');

var mysql = require('mysql');
var connection = mysql.createConnection({  
  host     : 'localhost',
  user     : 'rafaelsanzio',
  password : '',
  port     : 3306,
  database : 'c9'
});

connection.connect(function(err){
    if (err){
      console.log(err);
    } 
    console.log(connection.state);
});

function teste(callback) {
  connection.query('SELECT * FROM `usuario`', function(err, rows, fields) { 
    //console.log(rows);
    //connection.end();
    callback(null,rows);
  });
}

teste(function(err, content) {
  if (err) {
    console.log(err);
  } else {
    var n = content;
    console.log(n[0].NOME_USUA);
  }
});

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

var messages = [];
var sockets = [];
var estados = [];
var userID;
var profID;
var espeID;
var dataMarc;
var horaMarc;
var nomeUsua;
var nomeProf;
var horario;
var timeOut1;
var agenMarcado = false;

//GET DA PÁGINA /WEBHOOK - RESPOSTA AS PERGUNTAS DO CHATBOT
router.get('/webhook', function(req, res) {
  /* VALIDANDO SENHA */
  if(req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === 'rafa2695'){
    console.log('Validação Ok');
    /* Servidor aceitou a requisição */
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.log('Validação Falhou');
    /* Mensagem enviada para dizer que a requisição falhou */
    res.sendStatus(403);
  }
});

/* Requisições POST feita pelo usuário (body-parser) */
router.post('/webhook', function(req, res) {
  
  /* O que recebe do Facebook */
  var data = req.body;
  
  /* Verifica se o envio é do Facebook */
  if(data && data.object === 'page') {
    /* Percorre todas as entradas do data */
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOffEvent = entry.time;
      /* Percorrer todas as mensagens */
      entry.messaging.forEach(function (event){
        userID = event.sender.id;
        if (event.message) {
          trataMensagem(event);
        } else {
          if (event.postback && event.postback.payload) {
            switch (event.postback.payload) {
              case 'clicou_comecar':
                verificaUsuario(event.sender.id, function(err, content, flag) {
                  if (err) {
                    console.log(err);
                  } else {
                    var eUsuario = flag;
                    if(eUsuario){
                      nomeUsua = content[0].NOME_USUA;
                      var userID = content[0].USUARIO_ID;
                      sendTextMessage(event.sender.id, 'Seja bem vindo '+ nomeUsua +' à clínica Ateliê do Sorriso. Sou o AssistBot, seu assistente de atendimento!');
                      /* Verificar se tem atendimento */
                      verificaMarcacao(event.sender.id, function(err, flag, rows) {
                         if(err){
                           console.log(err);
                         } else {
                            if (flag) {
                              nomeProf = rows[0].NOME_PROF;                           
                              dataMarc = dateFormat(rows[0].DATA_MARC, 'dd/mm/yyyy');
                              horaMarc = rows[0].HORA_MARC.substring(0,5);
                              horario = dataMarc +' às '+ horaMarc;
                              agenMarcado = true;
                              profID = rows[0].PROF_ID;
                              estados[event.sender.id] = 'confirma_atendimento';
                              setTimeout(function(){
                                sendTextMessage(event.sender.id, 'Verifiquei nos meus registro e vejo que você tem um atendimento!');
                              }, 2000);
                              setTimeout(function(){
                                optionsAtendimento(event.sender.id, nomeProf, horario);
                              }, 2500);
                           } else {
                            sendFirstMenu(event.sender.id); 
                            estados[event.sender.id] = "mostrou_menu";
                           }
                         }
                      });
                    } else {
                      getUsuario(event.sender.id);  
                    }
                  }
                });
              break;
              
              /* Tratamento caso clique no botão Ortodontia */
             case 'clicou_orto':
               /* Ver dentistas disponiveis */
               var payload = 'orto_prof_';
                espeID = 1;
                verificaDisponibilidade(espeID, event.sender.id, function(err, arrProf, idsProf) {
                  estados[event.sender.id] = "mostrou_menu";
                  sendTextMessage(event.sender.id, "Certo, irei lhe mostrar as opções de profissionais para a especialidade escolhida!");
                  setTimeout(function(){
                    optionsMenuProfNovo(arrProf, idsProf, event.sender.id, payload);  
                  }, 2000);
                });
              break;
              
              /* Tratamento caso clique no botão Estética Bucal */
              case 'clicou_estetica':
                var payload = 'estetica_prof_';
                espeID = 2;
                estados[event.sender.id] = "mostrou_menu";
                verificaDisponibilidade(espeID, event.sender.id, function(err, arrProf, idsProf) {
                  sendTextMessage(event.sender.id, "Certo, irei lhe mostrar as opções de profissionais para a especialidade escolhida!");
                  setTimeout(function(){
                    optionsMenuProfNovo(arrProf, idsProf, event.sender.id, payload);  
                  }, 2000);
                });
              break;
              
              case 'clicou_cirurgia':
                var payload = 'cirurgia_prof_';
                espeID = 3;
                estados[event.sender.id] = "mostrou_menu";
                verificaDisponibilidade(espeID, event.sender.id, function(err, arrProf, idsProf) {
                  sendTextMessage(event.sender.id, "Certo, irei lhe mostrar as opções de profissionais para a especialidade escolhida!");
                  setTimeout(function(){
                    optionsMenuProfNovo(arrProf, idsProf, event.sender.id, payload);  
                  }, 2000);
                });
              break;
              
              /* Profissionais */
              case 'orto_prof_1':
                profID = 1;
                verificaData(profID, event.sender.id, function(err, arrDias){
                  sendTextMessage(event.sender.id, 'Ok! Agora irei lhe mostrar as opções de datas para consulta!');
                  setTimeout(function(){
                    mensagensProfissional(err, arrDias, event.sender.id);  
                  }, 1500);
                });
              break;
              
               case 'orto_prof_2':
                profID = 2;
                verificaData(profID, event.sender.id, function(err, arrDias){
                  sendTextMessage(event.sender.id, 'Ok! Agora irei lhe mostrar as opções de horários para consulta!');
                  setTimeout(function(){
                    mensagensProfissional(err, arrDias, event.sender.id);  
                  }, 1500);
                });
              break;
              
              case 'estetica_prof_2':
                profID = 2;
                verificaData(profID, event.sender.id, function(err, arrDias){
                  sendTextMessage(event.sender.id, 'Ok! Agora irei lhe mostrar as opções de horários para consulta!');
                  setTimeout(function(){
                    mensagensProfissional(err, arrDias, event.sender.id);  
                  }, 1500);
                });
              break;
              
              case 'estetica_prof_3':
                profID = 3;
                verificaData(profID, event.sender.id, function(err, arrDias){
                  sendTextMessage(event.sender.id, 'Ok! Agora irei lhe mostrar as opções de horários para consulta!');
                  setTimeout(function(){
                    mensagensProfissional(err, arrDias, event.sender.id);  
                  }, 1500);
                });
              break;
              
              case 'cirurgia_prof_1':
                profID = 1;
                verificaData(profID, event.sender.id, function(err, arrDias){
                  sendTextMessage(event.sender.id, 'Ok! Agora irei lhe mostrar as opções de horários para consulta!');
                  setTimeout(function(){
                    mensagensProfissional(err, arrDias, event.sender.id);  
                  }, 1500);
                });
              break;
              
              case 'cirurgia_prof_3':
                profID = 3;
                verificaData(profID, event.sender.id, function(err, arrDias){
                  sendTextMessage(event.sender.id, 'Ok! Agora irei lhe mostrar as opções de horários para consulta!');
                  setTimeout(function(){
                    mensagensProfissional(err, arrDias, event.sender.id);  
                  }, 1500);
                });
              break;
              
              
              default:
                // code
            }
          }
        }  
      });
      
    });
    /* Resposta ao Facebook, mostrando que recebeu a mensagem */
    res.sendStatus(200);
  }
});

function trataMensagem(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOffMessage = event.timestamp;
  var message = event.message;
  
  console.log('Mensagem recebida pelo usuário %d pela página %d', senderID, recipientID);
  
  var messageID = message.mid;
  var messageText = message.text;
  var attachments = message.attachments;
  
  /* Identificando as mensagens e as tratando */
  if (messageText) {
    
    if (estados[senderID]) {
      switch (estados[senderID]) {
        case 'mostrou_menu':
          if(messageText.toUpperCase() == 'SAIR'){
            sendTextMessage(event.sender.id, 'Obrigado por utilizar nossos serviços. Volte sempre!');
            estados[event.sender.id] = "escreveu_sair";
          } else {
            sendTextMessage(event.sender.id, 'Desculpe, mas você precisa escolher uma opção do menu!');
            sendFirstMenu(event.sender.id);  
          }
        break;
        
        case 'escreveu_sair':
          verificaMarcacao(event.sender.id, function(err, flag, rows){
            if(err){
              console.log(err);
            } else {
              if (flag){
                /* Se tiver agendamento, opção de reagendar */
                sendTextMessage(event.sender.id, 'Seja bem vindo de volta '+ nomeUsua +'!');
                setTimeout(function(){
                  sendTextMessage(event.sender.id, 'Verifiquei nos meus registros, vejo que você tem um agendamento marcado!');
                }, 1500);
                setTimeout(function(){
                  agenMarcado = true;
                  estados[event.sender.id] = 'confirma_atendimento';
                  optionsAtendimento(event.sender.id, rows[0].NOME_PROF, horario);
                }, 2000);
              } else {
                /* Se não tiver agendamento, voltar ao menu inicial */
                sendTextMessage(event.sender.id, 'Seja bem vindo de volta '+nomeUsua+'! Inicie o passo a passo pelo nosso Menu!');
                sendFirstMenu(event.sender.id);
                estados[event.sender.id] = "mostrou_menu";
              }
            }
          });
        break;
        
        case 'cancelou_agendamento':
          if(messageText.toUpperCase() == 'SAIR'){
            sendTextMessage(event.sender.id, 'Obrigado por utilizar nossos serviços. Volte sempre!');
            estados[event.sender.id] = "escreveu_sair";
          } else {
            sendTextMessage(event.sender.id, 'Olá '+ nomeUsua + '!'); 
            setTimeout(function(){
              sendTextMessage(event.sender.id, 'Vericando seu histórico... Vejo que seu último agendamento foi cancelado. Sendo assim vou lhe mostrar as opções de menu!');
              sendFirstMenu(event.sender.id);  
            }, 1500);
          }
        break;
        
        case 'escolhe_data':
          if(messageText.toUpperCase() == 'SAIR'){
            sendTextMessage(event.sender.id, 'Obrigado por utilizar nossos serviços. Volte sempre!');
            estados[event.sender.id] = "escreveu_sair";
          } else {
              var payloadData = event.message.quick_reply;
              dataMarc = messageText;
              if (payloadData) {
                verificaHorario(profID, dataMarc, function(err, arrHora) {
                  if (err) {
                    console.log("Erro de consulta");
                  } else {
                    if(arrHora.length > 0){
                      /*AQUI*/
                      sendTextMessage(event.sender.id, 'Certo! Agora irei lhe mostrar as opções de horários para consulta!');
                      setTimeout(function() {
                        menuHorario(arrHora, event.sender.id);
                        }, 1500);
                      estados[event.sender.id] = "escolhe_horario";
                    } else {
                      sendTextMessage(event.sender.id, 'Desculpe o transtorno, mas não temos horários disponiveis para esse profissional!');
                      estados[event.sender.id] = "mostra_menu";
                    }
                  }
                });
              } else {
                sendTextMessage(event.sender.id, "Desculpe! Mas é necessário escolher uma data");
                setTimeout(function() {
                  verificaData(profID, event.sender.id, function(err, arrDias){
                    mensagensProfissional(err, arrDias, event.sender.id);  
                  });
                }, 2000);
              }
          }
        break;
        
        case "escolhe_horario":
          if(messageText.toUpperCase() == 'SAIR'){
            sendTextMessage(event.sender.id, 'Obrigado por utilizar nossos serviços. Volte sempre!');
            estados[event.sender.id] = "escreveu_sair";
          } else {
              var payloadHora = event.message.quick_reply;
              horaMarc = messageText;
              horario = dataMarc + ' às ' + horaMarc;
              if (payloadHora) {
                estados[event.sender.id] = "confirma_atendimento";
                confirmaAtendimento(profID, event.sender.id, function(err, nomeProf){
                  if(err){
                    console.log(err);
                  } else {
                    optionsAtendimento(event.sender.id, nomeProf, horario);
                  }
                });
              } else {
                sendTextMessage(event.sender.id, "Desculpe! Mas é necessário escolher um horário");
                setTimeout(function() {
                  verificaHorario(profID, dataMarc, function(err, arrHora) {
                    if (err) {
                      console.log("Erro de consulta");
                    } else {
                      if(arrHora.length > 0){
                        menuHorario(arrHora, event.sender.id);
                        estados[event.sender.id] = "escolhe_horario";
                      } else {
                        sendTextMessage(event.sender.id, 'Desculpe o transtorno, mas não temos horários disponiveis para esse profissional!');
                        estados[event.sender.id] = "mostra_menu";
                      }
                    }
                  }); 
                }, 2000);
              }
            }
        break;
        
        case 'confirma_atendimento':
          if(messageText.toUpperCase() == 'CONFIRMAR') {
            dataMarc = formataDataUS (dataMarc);
            var horaActually = pegaHoraAgora();
            var hh = horaMarc.substring(0,2) - 2; /* Aviso duas horas antes do atendimento */
            var mm = horaMarc.substring(3,5);
            var horarioAviso = hh+':'+mm;
            if(!agenMarcado){
              addMarcacao(event.sender.id, profID, dataMarc, horaMarc);
            } else {
              sendTextMessage(event.sender.id, "Obrigado pela preferência, seu horário foi agendado com sucesso!");
              setTimeout(function() {
                  verLocation(event.sender.id);
              }, 1000);
              if(dataMarc == dataAtual && horaActually < horarioAviso){
                setTimeout(function() {
                    sendTextMessage(senderID, "Aviso! Caso queira receber uma mensagem de lembrete do seu agendamento, não apague a conversa!");
                }, 1500);
              }
            }
            var data = new Date();
            var dia = data.getDate();
            var mes = data.getMonth() + 1;
            if(mes < 10){
              mes = '0'+mes;
            }
            var ano = data.getFullYear();
            var dataAtual = dia+'/'+mes+'/'+ano;
            console.log(horarioAviso);
            console.log(dataAtual);
            dataMarc = dateFormat(dataMarc, 'dd/mm/yyyy');
            console.log(dataMarc);
            timeOut1 = setInterval(function() {
              var horaAtual = pegaHoraAgora();
              console.log(horaAtual);
              if(dataMarc == dataAtual && horaAtual == horarioAviso) {
                /* Aviso do Agendamento */
                sendTextMessage(event.sender.id, 'Olá, estou passando para lembra que você tem um agendamento há algumas horas... Seu horário é com a Dr. '+nomeProf+' às '+ horario.substring(14, 19));
                clearInterval(timeOut1);
              } else if(dataMarc == dataAtual && horaAtual > horarioAviso) {
                console.log('teste');
                clearInterval(timeOut1);
              }
            }, 60000);
            estados[event.sender.id] = 'agendado';
          } else if (messageText.toUpperCase() == 'CANCELAR') {
            /* Verificar se tem agendamento, caso sim: excluir | caso não: voltar ao menu */
            verificaMarcacao(event.sender.id, function(err, flag, rows) {
              if(err){
                console.log(err);
              } else {
                 if(flag){
                    dataMarc = dateFormat(rows[0].DATA_MARC, 'yyyy/mm/dd');
                    horaMarc = rows[0].HORA_MARC.substring(0,5);
                    profID = rows[0].PROF_ID;
                    deletaAgendamento(rows[0].MARC_ID, function(err, deleta){
                     if(err) {
                       console.log(err);
                     } else {
                       var marcadoAgen = 0;
                       updateAgenda(marcadoAgen, dataMarc, horaMarc, profID, function(err, content) {
                         if(content) {
                          agenMarcado = false;
                          estados[event.sender.id] = "cancelou_agendamento";
                          sendTextMessage(event.sender.id, 'Seu agendamento foi cancelado! Obrigado pelo contato.');
                        } else {
                          console.log('Erro no update da Agenda');
                        }
                       });
                     }
                   });
                 } else {
                   estados[event.sender.id] = "mostrou_menu";
                   sendTextMessage(event.sender.id, 'Como não confirmou sua consulta, vou lhe dar as opções de menu novamente');
                   sendFirstMenu(event.sender.id);
                 }
               }
            });
          } else if (messageText.toUpperCase() == 'REMARCAR') {
              verificaMarcacao(event.sender.id, function(err, flag, rows) {
              if(err){
                console.log(err);
              } else {
                 if(flag){
                    dataMarc = dateFormat(rows[0].DATA_MARC, 'yyyy/mm/dd');
                    horaMarc = rows[0].HORA_MARC.substring(0,5);
                    profID = rows[0].PROF_ID;
                    verificaData(profID, event.sender.id, function(err, arrDias){
                      if(arrDias.length != 0) {
                        deletaAgendamento(rows[0].MARC_ID, function(err, deleta){
                        if(err) {
                         console.log(err);
                        } else {
                            var marcadoAgen = 0;
                            updateAgenda(marcadoAgen, dataMarc, horaMarc, profID, function(err, content) {
                              if(content) {
                                agenMarcado = false;
                              } else {
                              console.log('Erro no update da Agenda');
                              }
                            });
                          }
                       });
                        menuOptionsAgen(arrDias, senderID);
                        estados[senderID] = 'escolhe_data';
                      } else {
                        sendTextMessage(senderID, 'Desculpe o transtorno, mas não temos horários disponiveis para esse profissional!');
                        optionsAtendimento(event.sender.id, nomeProf, horario);
                        estados[senderID] = 'confirma_atendimento';
                      }
                    });
                 } else {
                   estados[event.sender.id] = "mostrou_menu";
                   sendTextMessage(event.sender.id, 'Como não confirmou sua consulta, vou lhe dar as opções de Menu novamente!');
                   sendFirstMenu(event.sender.id);
                 }
               }
            });
          } else {
            sendTextMessage(event.sender.id, 'Desculpe, mas não consegui compreender sua resposta');
            optionsAtendimento(event.sender.id, nomeProf, horario);
          }
        break;
        
        case 'agendado':
          clearInterval(timeOut1);
          if(messageText.toUpperCase() == 'SAIR'){
              sendTextMessage(event.sender.id, 'Obrigado por utilizar nossos serviços. Volte sempre!');
              estados[event.sender.id] = "escreveu_sair";
          } else {
            verificaMarcacao(event.sender.id, function(err, flag, rows){
              if(err){
                console.log(err);
              } else {
                if (flag){
                  /* Se tiver agendamento, opção de reagendar */
                  sendTextMessage(event.sender.id, 'Seja bem vindo de volta '+ nomeUsua +'!');
                  setTimeout(function(){
                    sendTextMessage(event.sender.id, 'Verifiquei nos meus registros, vejo que você tem um agendamento marcado!');
                  }, 1500);
                  setTimeout(function(){
                    agenMarcado = true;
                    estados[event.sender.id] = 'confirma_atendimento';
                    optionsAtendimento(event.sender.id, rows[0].NOME_PROF, horario);
                  }, 2000);
                } else {
                  /* Se não tiver agendamento, voltar ao menu inicial */
                  sendTextMessage(event.sender.id, 'Verifiquei nos meus registros, vejo que você não tem nenhum agendamento! Inicie o passo a passo pelo nosso Menu!');
                  sendFirstMenu(event.sender.id);
                  estados[event.sender.id] = "mostrou_menu";
                }
              }
            });
          }
        break;
          
        default:
          // code
      }
    } else {
      /* Tratando mensagens (Interessante utilizar IA - BrainJS) */
      switch (messageText) {
        case 'Oi':
          /* Resposta */
          sendTextMessage(senderID, 'Oi, tudo bom com você ?');
          break;
          
        case 'Tchau':
          // code
          sendTextMessage(senderID, 'Obrigado pela visita, VOLTE SEMPRE!');
          break;
        
        default:
          // code
          sendTextMessage(senderID, 'Não compreendi sua pergunta, pode repetir...');
      }  
    }
  } else if (attachments){
    /* Tratamento de anexos */
    console.log('Me mandaram anexos');
  }
}

/* Preparado estrutura da mensagem para resposta (JSON)*/
function sendTextMessage (senderID, messageText) {
  var messageData = {
    recipient: {
      id: senderID
    },
    
    message: {
      text: messageText  
    }
  }; 
  callSendApi(messageData);
}

function verLocation (senderID) {
  var messageData = {
      recipient:{
      id: senderID
    },
    message:{
      attachment:{
        type:"template",
        payload:{
          template_type:"button",
          text:"Clique aqui para verificar a localização da clínica!",
          buttons:[
            {
              type:"web_url",
              url:"https://www.google.com.br/maps/place/R.+Piau%C3%AD,+Salvador+-+BA/@-13.0059131,-38.466716,17z/data=!3m1!4b1!4m5!3m4!1s0x7161b5e1ed0022f:0x3d2c88079b3d025f!8m2!3d-13.0059131!4d-38.4645273",
              title:"Abrir no Maps"
            }
          ]
        }
      }
    }
  };
  callSendApi(messageData);
}

/*function menuOptionsProf (arrProf, idsProf, senderID, payload) {
 var buttons = new Array();
 var posicao;
  for(var i = 0; i < arrProf.length; i++){
   posicao = idsProf[i];
    buttons[i] = { type: "postback", title: ''+ arrProf[i] +'', payload: ''+ payload + posicao +'' };
  }
   var messageData = {
    recipient: {
      id: senderID
    },
    
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: 'Para tal serviço temos os seguintes dentistas ?',
          buttons:  buttons
        }
      }
    }
  };
  callSendApi(messageData);
}*/

function menuHorario (arrHora, senderID) {
  var quick_replies = new Array();
  for(var i = 0; i < arrHora.length; i++) {
    quick_replies[i] = { content_type: "text", title: arrHora[i], payload: "hora_"+i+'' };
  }
   var messageData = {
    recipient:{
      id: senderID
    },
    
    message:{
      text: "Escolha um horário:",
      quick_replies: quick_replies 
    }
  };
  callSendApi(messageData);
}

function menuOptionsAgen (arrDias, senderID) {
  var quick_replies = new Array();
  console.log(arrDias);
  for(var i = 0; i < arrDias.length; i++){
    quick_replies[i] = { content_type: "text", title: arrDias[i], payload: "data_"+i+'' };
  }
   var messageData = {
    recipient:{
      id: senderID
    },
    message:{
      text: "Escolha uma data:",
      quick_replies: quick_replies 
    }
  };
  callSendApi(messageData);
}

function sendFirstMenu (senderID) {
   var messageData = {
    recipient: {
      id: senderID
    },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: 'O Ateliê do Sorriso dispõe dos seguintes serviços:',
          buttons: [
            {
              type: 'postback',
              title: 'Ortodontia',
              payload: 'clicou_orto'
            },
            
            {
              type: 'postback',
              title: 'Estética Bucal',
              payload: 'clicou_estetica'
            },
            
            {
              type: 'postback',
              title: 'Cirurgias',
              payload: 'clicou_cirurgia'
            }
            
          ]
        }
      }
    }
  };
  callSendApi(messageData);
}


/* Função do facebook para resposta à mensagem  */
function callSendApi(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: 'EAABpVGP9LQ4BAIaMvlmhQ11CVZBNesXd800d5e5ipXoKIqOj1v2LUZCUxcoejLOZBZBsCkb0FZBM0c34oZBc76VNIEArmt1tZCjpeMQsmcHeqlYhm9CM6v9W8u6vuZCLo02bUOm2itDRTpTxFGq1ZA2DsPZCiD3kg7EGpZCBmcCqGwTByxpnPW7jdzz'},
    method: 'POST',
    json : messageData
  }, function(error, response, body) {
    
    /* Verificando se há erro e vendo se a resposta foi completa */
     if(!error && response.statusCode == 200) {
       console.log('Mensagem enviada com sucesso');
       var recipientID = body.recipient_id;
       var messageID = body.message_id;
     } else {
       /* No caso de error tentar novamente (implementar) */
       console.log('Não foi possível enviar a mensagem!');
       console.log(error);
       console.log(body);
     }
  });
}

/* Função do facebook para resposta à mensagem  */
function getUsuario(userID) {
  request({
    uri: 'https://graph.facebook.com/v2.6/'+userID,
    qs: { access_token: 'EAABpVGP9LQ4BAIaMvlmhQ11CVZBNesXd800d5e5ipXoKIqOj1v2LUZCUxcoejLOZBZBsCkb0FZBM0c34oZBc76VNIEArmt1tZCjpeMQsmcHeqlYhm9CM6v9W8u6vuZCLo02bUOm2itDRTpTxFGq1ZA2DsPZCiD3kg7EGpZCBmcCqGwTByxpnPW7jdzz'},
    method: 'GET',
    json : true
  }, function(error, response, body) {
    /* Verificando se há erro e vendo se a resposta foi completa */
     if(!error && response.statusCode == 200) {
        nomeUsua = body.first_name + ' ' + body.last_name;
        insereUsuario(userID, nomeUsua);
     } else {
       /* No caso de error tentar novamente (implementar) */
       console.log(error);
     }
  });
}

function confirmaAtendimento(profID, senderID, callback){
  var sSQL = 'SELECT NOME_PROF FROM `profissional` WHERE PROF_ID ='+ profID;
  connection.query(sSQL, function(err, rows, fields) {  
    nomeProf = rows[0].NOME_PROF;
    callback(null, nomeProf);
  });
}

function optionsAtendimento (senderID, nomeProf, horario) {
  var recomecar;
  if (agenMarcado) {
    recomecar = { content_type: "text", title: 'Remarcar', payload: 'DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_BLACK' };
  } 
  else {
    recomecar = { content_type: "text", title: '', payload: 'DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_BLACK' };
  }
   var messageData = {
   recipient:{
    id: senderID
  },
  message:{
    //text : 'Deseja confirmar seu horário com a Dr. '+nomeProf+' no dia '+ horario +' ?',
    text : 'Então ficou agendado sua consulta com Dr(a). '+nomeProf+' no dia '+ horario +'. Deseja confirmar o agendamento ?',
    quick_replies:[
      {
        content_type:"text",
        title: 'Cancelar',
        payload:"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_RED"
      },
      {
        content_type:"text",
        title: 'Confirmar',
        payload:"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_GREEN"
      },
      recomecar
    ]
  }
};
  callSendApi(messageData);
}

function optionsMenuProfNovo (arrProf, idsProf, senderID, payload) {
  var opcoes = new Array();
  var posicao;
  for(var i = 0; i < arrProf.length; i++){
   posicao = idsProf[i];
   if (posicao == 1){ /* Barbara */
     var image_url = "https://www.thecheekypanda.co.uk/wp-content/uploads/2014/08/julie-avatar-260x300.jpg";
   } else if (posicao == 2) { /* Fábio */
     var image_url = "https://st2.depositphotos.com/1007566/11541/v/950/depositphotos_115416446-stock-illustration-avatar-business-man-vector-graphic.jpg";
   } else if (posicao == 3) { /* Isabella */
     var image_url = "http://4.bp.blogspot.com/-Ote1BConuRM/UOSy0TSyI3I/AAAAAAAAGPA/nMyTRJX1Rco/s1600/Paula+avatar.jpg";
   }
    opcoes[i] = { 
      title: arrProf[i],
      image_url: image_url,
      subtitle: "Clínica Ateliê do Sorriso",
      buttons:[
        {
          type: "web_url",
          url: "https://www.google.com.br/maps/place/R.+Piau%C3%AD,+Salvador+-+BA/@-13.0059131,-38.466716,17z/data=!3m1!4b1!4m5!3m4!1s0x7161b5e1ed0022f:0x3d2c88079b3d025f!8m2!3d-13.0059131!4d-38.4645273",
          title: "Ver Perfil"
        },
        {
          type: "postback",
          title: "Escolher horário",
          payload: ''+ payload + posicao +''
        }              
      ]      
    }; 
  }
   var messageData = {
      recipient: {
        id: senderID
      },
    message:{
      attachment:{
        type: "template",
        payload:{
          template_type: "generic",
          elements: opcoes
        }
      }
    }
  };
  callSendApi(messageData);
}

function insereUsuario(userID, nomeUsua){
  var sSQL = 'INSERT INTO `usuario` VALUES ('+userID+', "'+nomeUsua+'")';
  connection.query(sSQL, function(err, rows, fields) {  
    sendTextMessage(userID, 'Seja bem vindo '+ nomeUsua +' à clínica Ateliê do Sorriso, sou o AssistBot, seu assistente de atendimento!');
    sendFirstMenu(userID); 
    estados[userID] = 'mostrou_menu';
  });
}

function verificaUsuario(userID, callback){
  var sSQL = 'SELECT * FROM `usuario` WHERE USUARIO_ID = '+userID;
  connection.query(sSQL, function(err, rows, fields) {
    if(rows.length > 0){
      var existeUsuario = true; 
    } else {
      var existeUsuario = false;
    }
     callback(null, rows, existeUsuario);
  });
}

function addMarcacao(senderID, profID, dataMarc, horaMarc){
  dataMarc = dateFormat (dataMarc, 'yyyy/mm/dd');
  var sSQL = 'INSERT INTO `marcacao` (DATA_MARC, HORA_MARC, USUARIO_ID, PROF_ID) VALUES ("'+ dataMarc +'", "'+ horaMarc +'", '+ senderID +', '+ profID +')';
  connection.query(sSQL, function(err, rows, fields) {
    if(err){
      console.log(err);
    } else {
      var marcadoAgen = 1;
      updateAgenda(marcadoAgen, dataMarc, horaMarc, profID, function(err, content){
        if(content) {
          agenMarcado = true;
          sendTextMessage(senderID, "Aviso! Caso queira receber uma mensagem de lembrete do seu agendamento, não apague a conversa!");
          setTimeout(function(){
            verLocation(senderID);
          }, 1000);
          setTimeout(function(){
            sendTextMessage(senderID, "Obrigado pela preferência, seu horário foi agendado com sucesso!"); 
          }, 1500);
        } else {
          console.log('Erro no update da Agenda');
        }
      });
    }
  });
}

function updateAgenda(marcadoAgen, dataMarc, horaMarc, profID, callback){
  var sSQL = 'UPDATE `agenda` SET MARCADO_AGEN = '+ marcadoAgen +' WHERE DATA_AGEN = "'+ dataMarc +'" AND HORA_AGEN = "'+ horaMarc +'"';
  sSQL += ' AND PROF_ID =' + profID;
  connection.query(sSQL, function(err, rows, fields) {
    if(err) {
      console.log(err);
    } else {
      var completo = true;
      callback(null, completo);
    }
  });
}

function deletaAgendamento(marcID, callback){
  var sSQL = 'DELETE FROM `marcacao` WHERE MARC_ID = '+ marcID;
  connection.query(sSQL, function(err, rows, fields) {
    if(err) {
      console.log(err);
    } else {
      var deleta = true;
      callback(null, deleta);
    }
  });
}

function verificaMarcacao(senderID, callback){
  var dataAtual = pegaDataAtual();
  var sSQL = 'SELECT M.MARC_ID, P.NOME_PROF, M.DATA_MARC, M.HORA_MARC, P.PROF_ID FROM `marcacao` M';
  sSQL += ' LEFT JOIN `profissional` P ON P.PROF_ID = M.PROF_ID';
  sSQL += '  WHERE M.USUARIO_ID ='+ senderID +' AND M.DATA_MARC >= "'+dataAtual+'"';
  connection.query(sSQL, function(err, rows, fields) {
    if(err) {
      console.log(err);
    } else {
      if(rows.length > 0){
        var completo = true;
      } else {
        var completo = false;
      }
      callback(null, completo, rows);
    }
  });
}

function verificaData(profID, senderID, callback) {
  var dataHoje = pegaDataAtual();
  /* Ajeitar consulta posteriormente */
  var sSQL = 'SELECT A.DATA_AGEN FROM `agenda` A'; 
      sSQL += ' LEFT JOIN `profissional` P ON P.PROF_ID = A.PROF_ID';
      sSQL += ' WHERE A.PROF_ID = ' + profID;
      sSQL += ' AND A.DATA_AGEN >= "' + dataHoje +'"';
      //sSQL += ' AND A.HORA_AGEN >= "' + horaAgora +'"';
      sSQL += ' AND A.MARCADO_AGEN = 0';
      sSQL += ' GROUP BY (A.DATA_AGEN)';
  var arrDias = [];
  connection.query(sSQL, function(err, rows, fields) {
    for(var i = 0; i < rows.length; i++){
      arrDias[i] = dateFormat(rows[i].DATA_AGEN, 'dd/mm/yyyy');
      //arrHora[i] = rows[i].HORA_AGEN.substring(0,5);
    }
    callback(null, arrDias);
  });
}

function verificaHorario(profID, dataAgen, callback) {
  dataAgen = formataDataBanco(dataAgen);
  /* Ajeitar consulta posteriormente */
  var sSQL = 'SELECT A.HORA_AGEN FROM `agenda` A'; 
      sSQL += ' LEFT JOIN `profissional` P ON P.PROF_ID = A.PROF_ID';
      sSQL += ' WHERE A.PROF_ID = ' + profID;
      sSQL += ' AND A.DATA_AGEN = "' + dataAgen +'"';
      //sSQL += ' AND A.HORA_AGEN >= "' + horaAgora +'"';
      sSQL += ' AND A.MARCADO_AGEN = 0';
      sSQL += ' ORDER BY A.HORA_AGEN';
  console.log(sSQL);
  var arrHora = [];
  connection.query(sSQL, function(err, rows, fields) {
    for(var i = 0; i < rows.length; i++){
      //arrDias[i] = dateFormat(rows[i].DATA_AGEN, 'dd/mm/yyyy');
      arrHora[i] = rows[i].HORA_AGEN.substring(0,5);
    }
    callback(null, arrHora);
  });
}

function verificaDisponibilidade(espeID, senderID, callback) {
  var sSQL = 'SELECT P.PROF_ID, P.NOME_PROF FROM `especialidade_profissional` EP'; 
      sSQL += ' LEFT JOIN `especialidade` E ON E.ESPE_ID = EP.ESPE_ID';
      sSQL += ' LEFT JOIN `profissional` P ON P.PROF_ID = EP.PROF_ID';
      sSQL += ' WHERE EP.ESPE_ID = ' + espeID;
  var arrProf = [];
  var idsProf = [];
  connection.query(sSQL, function(err, rows, fields) {  
    for(var i = 0; i < rows.length; i++){
      arrProf[i] = rows[i].NOME_PROF;
      idsProf[i] = rows[i].PROF_ID;
    }
    callback(null, arrProf, idsProf);
    //menuOptionsProf(arrProf, senderID);
  });
}

function mensagensProfissional(err, arrDias, senderID){
  if(err) {
    console.log(err);
  } else {
    if(arrDias.length != 0) {
      menuOptionsAgen(arrDias, senderID);
      estados[senderID] = 'escolhe_data';
    } else {
      sendTextMessage(senderID, 'Desculpe o transtorno, mas não temos horários disponiveis para esse profissional!');
      sendFirstMenu(senderID);
      estados[senderID] = 'mostrou_menu';
    }
  }
}

function formataDataUS (data){
  var dia = data.substring(0,2);
  var mes = data.substring(3,5);
  var ano = data.substring(6,10);
  data = mes +'/'+ dia +'/'+ ano;
  data = dateFormat(data);
  return data;
}

function formataDataBanco (data){
  var dia = data.substring(0,2);
  var mes = data.substring(3,5);
  var ano = data.substring(6,10);
  data =  ano +'/'+ mes +'/'+ dia
  data = dateFormat(data, 'yyyy/mm/dd');
  return data;
}

function pegaDataAtual(){
  var data = new Date();
  var dia = data.getDate();
  var mes = data.getMonth() + 1;
  if(mes < 10){
    mes = '0'+mes;
  }
  var ano = data.getFullYear();
  var dataAtual = ano+'/'+mes+'/'+dia;
  return dataAtual;
}

function pegaHoraAgora(){
  var data = new Date();
  var hora = data.getHours() - 3;
  var min  = data.getMinutes();
  if((min - 10) < 0){
    min = '0'+min;
  }
  var horaAgora = hora+':'+min;
  return horaAgora;
}

io.on('connection', function (socket) {
    messages.forEach(function (data) {
      socket.emit('message', data);
    });

    sockets.push(socket);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('message', function (msg) {
      var text = String(msg || '');

      if (!text)
        return;

      socket.get('name', function (err, name) {
        var data = {
          name: name,
          text: text
        };

        broadcast('message', data);
        messages.push(data);
      });
    });

    socket.on('identify', function (name) {
      socket.set('name', String(name || 'Anonymous'), function (err) {
        updateRoster();
      });
    });
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
