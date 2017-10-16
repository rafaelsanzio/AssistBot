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

var functions = require('./functions.js');
var mensagens = require('./messages.js');

var scheduler = require('node-schedule');

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

var messages = [], sockets = [], estados = [];
var userID, profID, espeID;
var dataMarc, horaMarc, horario, mesEmExtenso;
var nomeUsua, nomeProf;
var j;
var statusUsua;
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
                      userID = content[0].USUARIO_ID;
                      mensagens.sendTextMessage(event.sender.id, 'Seja bem vindo '+ nomeUsua +' à clínica Ateliê do Sorriso. Sou a NicoleBot, sua assistente de atendimento virtual!');
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
                              atualizaEstado(estados[event.sender.id], event.sender.id);
                              setTimeout(function(){
                                mensagens.sendTextMessage(event.sender.id, 'Verifiquei nos meus registro e vejo que você tem um atendimento!');
                              }, 2000);
                              setTimeout(function(){
                                mensagens.optionsAtendimento(event.sender.id, nomeProf, horario, agenMarcado);
                              }, 2500);
                           } else {
                            mensagens.sendFirstMenu(event.sender.id); 
                            estados[event.sender.id] = "mostrou_menu";
                            atualizaEstado(estados[event.sender.id], event.sender.id);
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
                  atualizaEstado(estados[event.sender.id], event.sender.id);
                  mensagens.sendTextMessage(event.sender.id, "Certo, irei lhe mostrar as opções de profissionais para a especialidade escolhida!");
                  setTimeout(function(){
                    mensagens.optionsMenuProfNovo(arrProf, idsProf, event.sender.id, payload);  
                  }, 2000);
                });
              break;
              
              /* Tratamento caso clique no botão Estética Bucal */
              case 'clicou_estetica':
                var payload = 'estetica_prof_';
                espeID = 2;
                estados[event.sender.id] = "mostrou_menu";
                atualizaEstado(estados[event.sender.id], event.sender.id);
                verificaDisponibilidade(espeID, event.sender.id, function(err, arrProf, idsProf) {
                  mensagens.sendTextMessage(event.sender.id, "Certo, irei lhe mostrar as opções de profissionais para a especialidade escolhida!");
                  setTimeout(function(){
                    mensagens.optionsMenuProfNovo(arrProf, idsProf, event.sender.id, payload);  
                  }, 2000);
                });
              break;
              
              case 'clicou_cirurgia':
                var payload = 'cirurgia_prof_';
                espeID = 3;
                estados[event.sender.id] = "mostrou_menu";
                atualizaEstado(estados[event.sender.id], event.sender.id);
                verificaDisponibilidade(espeID, event.sender.id, function(err, arrProf, idsProf) {
                  mensagens.sendTextMessage(event.sender.id, "Certo, irei lhe mostrar as opções de profissionais para a especialidade escolhida!");
                  setTimeout(function(){
                    mensagens.optionsMenuProfNovo(arrProf, idsProf, event.sender.id, payload);  
                  }, 2000);
                });
              break;
              
              /* Profissionais */
              case 'orto_prof_1':
                profID = 1;
                verificaMeses(profID, event.sender.id, function (err, arrMeses, numMes){
                  mensagens.sendTextMessage(event.sender.id, 'Ok! Agora irei lhe mostrar as opções de meses para consulta!');
                  setTimeout(function(){
                    mensagensProfissional(err, arrMeses, event.sender.id);  
                  }, 1500);
                });
                /*verificaData(profID, event.sender.id, function(err, arrDias){
                  mensagens.sendTextMessage(event.sender.id, 'Ok! Agora irei lhe mostrar as opções de datas para consulta!');
                  setTimeout(function(){
                    mensagensProfissional(err, arrDias, event.sender.id);  
                  }, 1500);
                });*/
              break;
              
               case 'orto_prof_2':
                profID = 2;
                verificaData(profID, event.sender.id, function(err, arrDias){
                  mensagens.sendTextMessage(event.sender.id, 'Ok! Agora irei lhe mostrar as opções de horários para consulta!');
                  setTimeout(function(){
                    mensagensProfissional(err, arrDias, event.sender.id);  
                  }, 1500);
                });
              break;
              
              case 'estetica_prof_2':
                profID = 2;
                verificaData(profID, event.sender.id, function(err, arrDias){
                  mensagens.sendTextMessage(event.sender.id, 'Ok! Agora irei lhe mostrar as opções de horários para consulta!');
                  setTimeout(function(){
                    mensagensProfissional(err, arrDias, event.sender.id);  
                  }, 1500);
                });
              break;
              
              case 'estetica_prof_3':
                profID = 3;
                verificaData(profID, event.sender.id, function(err, arrDias){
                  mensagens.sendTextMessage(event.sender.id, 'Ok! Agora irei lhe mostrar as opções de horários para consulta!');
                  setTimeout(function(){
                    mensagensProfissional(err, arrDias, event.sender.id);  
                  }, 1500);
                });
              break;
              
              case 'cirurgia_prof_1':
                profID = 1;
                verificaData(profID, event.sender.id, function(err, arrDias){
                  mensagens.sendTextMessage(event.sender.id, 'Ok! Agora irei lhe mostrar as opções de horários para consulta!');
                  setTimeout(function(){
                    mensagensProfissional(err, arrDias, event.sender.id);  
                  }, 1500);
                });
              break;
              
              case 'cirurgia_prof_3':
                profID = 3;
                verificaData(profID, event.sender.id, function(err, arrDias){
                  mensagens.sendTextMessage(event.sender.id, 'Ok! Agora irei lhe mostrar as opções de horários para consulta!');
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
    buscaEstado(event.sender.id, function(err, status){
      statusUsua = status;
      console.log(statusUsua);
    if (statusUsua) {
      switch (statusUsua) {
        case 'mostrou_menu':
          if(messageText.toUpperCase() == 'SAIR'){
            mensagens.sendTextMessage(event.sender.id, 'Obrigado por utilizar nossos serviços. Volte sempre!');
            estados[event.sender.id] = "escreveu_sair";
            atualizaEstado(estados[event.sender.id], event.sender.id);
          } else {
            mensagens.sendTextMessage(event.sender.id, 'Desculpe, mas você precisa escolher uma opção do menu!');
            mensagens.sendFirstMenu(event.sender.id);  
          }
        break;
        
        case 'escreveu_sair':
          verificaMarcacao(event.sender.id, function(err, flag, rows){
            if(err){
              console.log(err);
            } else {
              if (flag){
                /* Se tiver agendamento, opção de reagendar */
                mensagens.sendTextMessage(event.sender.id, 'Seja bem vindo de volta '+ nomeUsua +'!');
                setTimeout(function(){
                  mensagens.sendTextMessage(event.sender.id, 'Verifiquei nos meus registros, vejo que você tem um agendamento marcado!');
                }, 1500);
                setTimeout(function(){
                  agenMarcado = true;
                  estados[event.sender.id] = 'confirma_atendimento';
                  atualizaEstado(estados[event.sender.id], event.sender.id);
                  mensagens.optionsAtendimento(event.sender.id, rows[0].NOME_PROF, horario, agenMarcado);
                }, 2000);
              } else {
                /* Se não tiver agendamento, voltar ao menu inicial */
                mensagens.sendTextMessage(event.sender.id, 'Seja bem vindo de volta '+nomeUsua+'! Inicie o passo a passo pelo nosso Menu!');
                mensagens.sendFirstMenu(event.sender.id);
                estados[event.sender.id] = "mostrou_menu";
                atualizaEstado(estados[event.sender.id], event.sender.id);
              }
            }
          });
        break;
        
        case 'cancelou_agendamento':
          if(messageText.toUpperCase() == 'SAIR'){
            mensagens.sendTextMessage(event.sender.id, 'Obrigado por utilizar nossos serviços. Volte sempre!');
            estados[event.sender.id] = "escreveu_sair";
            atualizaEstado(estados[event.sender.id], event.sender.id);
          } else {
            mensagens.sendTextMessage(event.sender.id, 'Olá '+ nomeUsua + '!'); 
            setTimeout(function(){
              mensagens.sendTextMessage(event.sender.id, 'Vericando seu histórico... Vejo que seu último agendamento foi cancelado. Sendo assim vou lhe mostrar as opções de menu!');
              mensagens.sendFirstMenu(event.sender.id);  
            }, 1500);
          }
        break;
        
        case 'escolhe_mes':
          if(messageText.toUpperCase() == 'SAIR'){
            mensagens.sendTextMessage(event.sender.id, 'Obrigado por utilizar nossos serviços. Volte sempre!');
            estados[event.sender.id] = "escreveu_sair";
            atualizaEstado(estados[event.sender.id], event.sender.id);
          } else {
              var payloadData = event.message.quick_reply;
              mesEmExtenso = messageText;
              if (payloadData) {
                verificaData(profID, event.sender.id, function(err, arrDias) {
                  if (err) {
                    console.log("Erro de consulta");
                  } else {
                    if(arrDias.length > 0){
                      mensagens.sendTextMessage(event.sender.id, 'Certo! Agora irei lhe mostrar as opções de datas para consulta!');
                      setTimeout(function() {
                        mensagens.menuOptionsAgen(arrDias, event.sender.id);
                        }, 1500);
                      estados[event.sender.id] = "escolhe_data";
                      atualizaEstado(estados[event.sender.id], event.sender.id);
                    } else {
                      mensagens.sendTextMessage(event.sender.id, 'Desculpe o transtorno, mas não temos horários disponiveis para esse profissional!');
                      estados[event.sender.id] = "mostra_menu";
                      atualizaEstado(estados[event.sender.id], event.sender.id);
                    }
                  }
                });
              } else {
                mensagens.sendTextMessage(event.sender.id, "Desculpe! Mas é necessário escolher uma mês");
                setTimeout(function() {
                  verificaMeses(profID, event.sender.id, function(err, arrDias){
                    mensagensProfissional(err, arrDias, event.sender.id);  
                  });
                }, 2000);
              }
          }
        break;
        
        case 'escolhe_data':
          if(messageText.toUpperCase() == 'SAIR'){
            mensagens.sendTextMessage(event.sender.id, 'Obrigado por utilizar nossos serviços. Volte sempre!');
            estados[event.sender.id] = "escreveu_sair";
            atualizaEstado(estados[event.sender.id], event.sender.id);
          } else {
              var payloadData = event.message.quick_reply;
              dataMarc = messageText;
              if (payloadData) {
                verificaHorario(profID, dataMarc, function(err, arrHora) {
                  if (err) {
                    console.log("Erro de consulta");
                  } else {
                    if(arrHora.length > 0){
                      mensagens.sendTextMessage(event.sender.id, 'Certo! Agora irei lhe mostrar as opções de horários para consulta!');
                      setTimeout(function() {
                        mensagens.menuHorario(arrHora, event.sender.id);
                        }, 1500);
                      estados[event.sender.id] = "escolhe_horario";
                      atualizaEstado(estados[event.sender.id], event.sender.id);
                    } else {
                      mensagens.sendTextMessage(event.sender.id, 'Desculpe o transtorno, mas não temos horários disponiveis para esse profissional!');
                      estados[event.sender.id] = "mostra_menu";
                      atualizaEstado(estados[event.sender.id], event.sender.id);
                    }
                  }
                });
              } else {
                mensagens.sendTextMessage(event.sender.id, "Desculpe! Mas é necessário escolher uma data");
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
            mensagens.sendTextMessage(event.sender.id, 'Obrigado por utilizar nossos serviços. Volte sempre!');
            estados[event.sender.id] = "escreveu_sair";
            atualizaEstado(estados[event.sender.id], event.sender.id);
          } else {
              var payloadHora = event.message.quick_reply;
              horaMarc = messageText;
              horario = dataMarc + ' às ' + horaMarc;
              if (payloadHora) {
                estados[event.sender.id] = "confirma_atendimento";
                atualizaEstado(estados[event.sender.id], event.sender.id);
                confirmaAtendimento(profID, event.sender.id, function(err, nomeProf){
                  if(err){
                    console.log(err);
                  } else {
                    mensagens.optionsAtendimento(event.sender.id, nomeProf, horario, agenMarcado);
                  }
                });
              } else {
                mensagens.sendTextMessage(event.sender.id, "Desculpe! Mas é necessário escolher um horário");
                setTimeout(function() {
                  verificaHorario(profID, dataMarc, function(err, arrHora) {
                    if (err) {
                      console.log("Erro de consulta");
                    } else {
                      if(arrHora.length > 0){
                        mensagens.menuHorario(arrHora, event.sender.id);
                        estados[event.sender.id] = "escolhe_horario";
                        atualizaEstado(estados[event.sender.id], event.sender.id);
                      } else {
                        mensagens.sendTextMessage(event.sender.id, 'Desculpe o transtorno, mas não temos horários disponiveis para esse profissional!');
                        estados[event.sender.id] = "mostra_menu";
                        atualizaEstado(estados[event.sender.id], event.sender.id);
                      }
                    }
                  }); 
                }, 2000);
              }
            }
        break;
        
        case 'confirma_atendimento':
          if(messageText.toUpperCase() == 'CONFIRMAR') {
            dataMarc = functions.formataDataUS(dataMarc);
            var horaActually = functions.pegaHoraAgora();
            var hh = parseInt(horaMarc.substring(0,2)) + 1; /* Aviso duas horas antes do atendimento */
            var mm = horaMarc.substring(3,5);
            var horarioAviso = hh+':'+mm;

            var data = new Date();
            var dia = data.getDate();
            var mes = data.getMonth() + 1;
            if(mes < 10){
              mes = '0'+mes;
            }
            if(dia < 10){
              dia = '0'+dia;
            }
            var ano = data.getFullYear();
            var dataAtual = dia+'/'+mes+'/'+ano;
            
            if(!agenMarcado){
              addMarcacao(event.sender.id, profID, dataMarc, horaMarc);
            } else {
              mensagens.sendTextMessage(event.sender.id, "Obrigado pela preferência, seu horário foi agendado com sucesso!");
              setTimeout(function() {
                  mensagens.verLocation(event.sender.id);
              }, 1000);
            }
            estados[event.sender.id] = 'agendado';
            atualizaEstado(estados[event.sender.id], event.sender.id);
            dataMarc = dateFormat(dataMarc, 'dd/mm/yyyy');
            var dateAviso = new Date(dataMarc.substr(6,4), dataMarc.substr(3,2) - 1, dataMarc.substr(0,2), hh, mm, 00);
            console.log(dateAviso);
            console.log(new Date());
            console.log(dateAviso > new Date());
            if(dateAviso > new Date()){
              /* Aviso do Agendamento */
              j = scheduler.scheduleJob(dateAviso, function(){
                  console.log(dateAviso);
                  mensagens.sendTextMessage(event.sender.id, 'Olá, estou passando para lembrar que você tem um agendamento há algumas horas... Seu horário é com a Dr. '+nomeProf+' às '+ horario.substring(14, 19));
              });
            }
          } else if (messageText.toUpperCase() == 'CANCELAR') {
            /* Verificar se tem agendamento, caso sim: excluir | caso não: voltar ao menu */
            if(dateAviso > new Date()){
              j.cancel();
            }
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
                          atualizaEstado(estados[event.sender.id], event.sender.id);
                          mensagens.sendTextMessage(event.sender.id, 'Seu agendamento foi cancelado! Obrigado pelo contato.');
                        } else {
                          console.log('Erro no update da Agenda');
                        }
                       });
                     }
                   });
                 } else {
                   estados[event.sender.id] = "mostrou_menu";
                   atualizaEstado(estados[event.sender.id], event.sender.id);
                   mensagens.sendTextMessage(event.sender.id, 'Como não confirmou sua consulta, vou lhe dar as opções de menu novamente');
                   mensagens.sendFirstMenu(event.sender.id);
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
                    verificaMeses(profID, event.sender.id, function(err, arrMeses){
                      if(arrMeses.length != 0) {
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
                        mensagens.sendTextMessage(event.sender.id, 'Ok! Agora irei lhe mostrar as opções de mês para consulta!');
                        setTimeout(function(){
                          mensagens.menuOptionsMeses(arrMeses, senderID);
                          estados[senderID] = 'escolhe_mes';
                          atualizaEstado(estados[event.sender.id], event.sender.id);
                        }, 2000);
                      } else {
                        mensagens.sendTextMessage(senderID, 'Desculpe o transtorno, mas não temos horários disponiveis para esse profissional!');
                        mensagens.optionsAtendimento(event.sender.id, nomeProf, horario, agenMarcado);
                        estados[senderID] = 'confirma_atendimento';
                        atualizaEstado(estados[event.sender.id], event.sender.id);
                      }
                    });
                 } else {
                   estados[event.sender.id] = "mostrou_menu";
                   atualizaEstado(estados[event.sender.id], event.sender.id);
                   mensagens.sendTextMessage(event.sender.id, 'Como não confirmou sua consulta, vou lhe dar as opções de Menu novamente!');
                   mensagens.sendFirstMenu(event.sender.id);
                 }
               }
            });
          } else {
            mensagens.sendTextMessage(event.sender.id, 'Desculpe, mas não consegui compreender sua resposta');
            mensagens.optionsAtendimento(event.sender.id, nomeProf, horario, agenMarcado);
          }
        break;
        
        case 'agendado':
          if(dateAviso > new Date()){
            j.cancel();
          }
          if(messageText.toUpperCase() == 'SAIR'){
              mensagens.sendTextMessage(event.sender.id, 'Obrigado por utilizar nossos serviços. Volte sempre!');
              estados[event.sender.id] = "escreveu_sair";
              atualizaEstado(estados[event.sender.id], event.sender.id);
          } else {
            verificaMarcacao(event.sender.id, function(err, flag, rows){
              if(err){
                console.log(err);
              } else {
                if (flag){
                  /* Se tiver agendamento, opção de reagendar */
                  mensagens.sendTextMessage(event.sender.id, 'Seja bem vindo de volta '+ nomeUsua +'!');
                  setTimeout(function(){
                    mensagens.sendTextMessage(event.sender.id, 'Verifiquei nos meus registros, vejo que você tem um agendamento marcado!');
                  }, 1500);
                  setTimeout(function(){
                    agenMarcado = true;
                    estados[event.sender.id] = 'confirma_atendimento';
                    atualizaEstado(estados[event.sender.id], event.sender.id);
                    mensagens.optionsAtendimento(event.sender.id, rows[0].NOME_PROF, horario, agenMarcado);
                  }, 2000);
                } else {
                  /* Se não tiver agendamento, voltar ao menu inicial */
                  mensagens.sendTextMessage(event.sender.id, 'Verifiquei nos meus registros, vejo que você não tem nenhum agendamento! Inicie o passo a passo pelo nosso Menu!');
                  mensagens.sendFirstMenu(event.sender.id);
                  estados[event.sender.id] = "mostrou_menu";
                  atualizaEstado(estados[event.sender.id], event.sender.id);
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
          mensagens.sendTextMessage(senderID, 'Oi, tudo bom com você ?');
          break;
          
        case 'Tchau':
          // code
          mensagens.sendTextMessage(senderID, 'Obrigado pela visita, VOLTE SEMPRE!');
          break;
        
        default:
          // code
          mensagens.sendTextMessage(senderID, 'Não compreendi sua pergunta, pode repetir...');
      }  
    }
    });
  } else if (attachments){
    /* Tratamento de anexos */
    console.log('Me mandaram anexos');
  }
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

function mensagensProfissional(err, arrMeses, senderID){
  if(err) {
    console.log(err);
  } else {
    if(arrMeses.length != 0) {
      mensagens.menuOptionsMeses(arrMeses, senderID);
      estados[senderID] = 'escolhe_mes';
      atualizaEstado(estados[senderID], senderID);
    } else {
      mensagens.sendTextMessage(senderID, 'Desculpe o transtorno, mas não temos horários disponiveis para esse profissional!');
      mensagens.sendFirstMenu(senderID);
      estados[senderID] = 'mostrou_menu';
      atualizaEstado(estados[senderID], senderID);
    }
  }
}

/* Funções SQL */

function insereUsuario(userID, nomeUsua) {
  estados[userID] = 'mostrou_menu';
  var sSQL = 'INSERT INTO `usuario` VALUES ('+userID+', "'+nomeUsua+'" , "'+ estados[userID] +'")';
  console.log(sSQL);
  connection.query(sSQL, function(err, rows, fields) {  
    mensagens.sendTextMessage(userID, 'Seja bem vindo '+ nomeUsua +' à clínica Ateliê do Sorriso, sou a NicoleBot, sua assistente de atendimento virtual!');
    mensagens.sendFirstMenu(userID); 
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
          mensagens.verLocation(senderID);
          setTimeout(function(){
            mensagens.sendTextMessage(senderID, "Obrigado pela preferência, seu horário foi agendado com sucesso!"); 
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
  var dataAtual = functions.pegaDataAtual();
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
  var dataHoje = functions.pegaDataAtual();
  atualizaAgenda(profID); /* Aqui */
  var sSQL = 'SELECT A.DATA_AGEN FROM `agenda` A'; 
      sSQL += ' LEFT JOIN `profissional` P ON P.PROF_ID = A.PROF_ID';
      sSQL += ' WHERE A.PROF_ID = ' + profID;
      sSQL += ' AND MONTH(A.DATA_AGEN) = "' + functions.mes(mesEmExtenso) +'"';
      sSQL += ' AND A.DATA_AGEN >= "' + dataHoje +'"';
      sSQL += ' AND A.MARCADO_AGEN = 0';
      sSQL += ' GROUP BY (A.DATA_AGEN)';
  console.log(sSQL);
  var arrDias = [];
  connection.query(sSQL, function(err, rows, fields) {
    for(var i = 0; i < rows.length; i++){
      arrDias[i] = dateFormat(rows[i].DATA_AGEN, 'dd/mm/yyyy');
    }
    callback(null, arrDias);
  });
}

function verificaMeses(profID, senderID, callback) {
  var dataHoje = functions.pegaDataAtual();
  var sSQL = 'SELECT MONTH(A.DATA_AGEN) AS MES FROM `agenda` A'; 
      sSQL += ' LEFT JOIN `profissional` P ON P.PROF_ID = A.PROF_ID';
      sSQL += ' WHERE A.PROF_ID = ' + profID;
      sSQL += ' AND A.DATA_AGEN >= "' + dataHoje +'"';
      sSQL += ' AND A.MARCADO_AGEN = 0';
      sSQL += ' GROUP BY (MONTH(A.DATA_AGEN))';
  var arrMeses = [];
  var numeroMes;
  connection.query(sSQL, function(err, rows, fields) {
    for(var i = 0; i < rows.length; i++){
      numeroMes = rows[i].MES;
      arrMeses[i] = functions.mesEmExtenso(rows[i].MES);
    }
    callback(null, arrMeses, numeroMes);
  });
}

function verificaHorario(profID, dataAgen, callback) {
  dataAgen = functions.formataDataBanco(dataAgen);
  var sSQL = 'SELECT A.HORA_AGEN FROM `agenda` A'; 
      sSQL += ' LEFT JOIN `profissional` P ON P.PROF_ID = A.PROF_ID';
      sSQL += ' WHERE A.PROF_ID = ' + profID;
      sSQL += ' AND A.DATA_AGEN = "' + dataAgen +'"';
      sSQL += ' AND A.MARCADO_AGEN = 0';
      sSQL += ' ORDER BY A.HORA_AGEN';
  var arrHora = [];
  connection.query(sSQL, function(err, rows, fields) {
    for(var i = 0; i < rows.length; i++){
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
  });
}

function confirmaAtendimento(profID, senderID, callback){
  var sSQL = 'SELECT NOME_PROF FROM `profissional` WHERE PROF_ID ='+ profID;
  connection.query(sSQL, function(err, rows, fields) {  
    nomeProf = rows[0].NOME_PROF;
    callback(null, nomeProf);
  });
}

function atualizaEstado(estado, senderID) {
  var sSQL = 'UPDATE `usuario` SET STATUS_USUA = "'+ estado +'" WHERE USUARIO_ID = ' +senderID;
  connection.query(sSQL);
}

function buscaEstado(senderID, callback) {
  var sSQL = 'SELECT * FROM `usuario` WHERE USUARIO_ID = '+ senderID;
  connection.query(sSQL, function(err, rows, fields) {  
    statusUsua = rows[0].STATUS_USUA;
    callback(null, statusUsua);
  });
}

function atualizaAgenda(profID) {
  var horaActually = functions.pegaHoraAgora();
  var sSQL = 'UPDATE `agenda` SET MARCADO_AGEN = 1 WHERE HORA_AGEN <= "'+ horaActually + '" AND PROF_ID =' + profID;
  connection.query(sSQL);
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
