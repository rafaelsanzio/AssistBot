var request = require('request');

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

/* Preparado estrutura da mensagem para resposta (JSON)*/
exports.sendTextMessage = function (senderID, messageText) {
  var messageData = {
    recipient: {
      id: senderID
    },
    message: {
      text: messageText  
    }
  }; 
  callSendApi(messageData);
};

exports.sendFirstMenu = function(senderID) {
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
};

exports.menuHorario = function (arrHora, senderID) {
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
};

exports.menuOptionsAgen = function (arrDias, senderID) {
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
};

exports.verLocation = function (senderID) {
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
};

exports.optionsMenuProfNovo = function (arrProf, idsProf, senderID, payload) {
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
};

exports.optionsAtendimento = function (senderID, nomeProf, horario, agenMarcado) {
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
};