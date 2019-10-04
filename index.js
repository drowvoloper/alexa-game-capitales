// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
const {getSlotValue} = require('ask-sdk-core');
const util = require('util.js');
var persistenceAdapter = getPersistenceAdapter();
        
const capitales = require('capitales.js');

let pais, capital, practicando, desafio, contador, aciertos;
let acertadas = new Object;
let aprendidas = [];

function getPersistenceAdapter(tableName) {
    // This function is an indirect way to detect if this is part of an Alexa-Hosted skill
    function isAlexaHosted() {
        return process.env.S3_PERSISTENCE_BUCKET;
    }
    if (isAlexaHosted()) {
        const {S3PersistenceAdapter} = require('ask-sdk-s3-persistence-adapter');
        return new S3PersistenceAdapter({
            bucketName: process.env.S3_PERSISTENCE_BUCKET
        });
    } else {
        // IMPORTANT: don't forget to give DynamoDB access to the role you're using to run this lambda (via IAM policy)
        const {DynamoDbPersistenceAdapter} = require('ask-sdk-dynamodb-persistence-adapter');
        return new DynamoDbPersistenceAdapter({
            tableName: tableName || 'capitales',
            createTable: true
        });
    }
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const sessionCounter = sessionAttributes['sessionCounter'];
        const speakOutput = sessionCounter > 0 
        ? 'Vamos a aprender algunas capitales hoy! quieres practicar o te atreves con el modo desafío?'
        : `Te doy la bienvenida! Conmigo podrás aprender las capitales del mundo. 
        Para ello, te ofrezco dos modos de juego: un modo práctica en el que puedes aprender y repasar las capitales
        y un modo desafío que te permitirá poner a prueba tus conocimientos. Cuando quieras salir del modo en el que estás, di simplemente salir. 
        ¿Empezamos practicando, o te atreves con un desafío?`
        
        pais = '';
        capital = '';
        practicando = false;
        desafio = false;
        contador = 0;
        aciertos = 0;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const JuegoIntentHandler = {
    
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'JuegoIntent';
   
    },
    
    handle(handlerInput) {
        
        const intent = handlerInput.requestEnvelope.request.intent;
        
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        
        // Determina el modo de juego que ha elegido la usuaria
        if (!sessionAttributes.modo) {
            const modo = getSlotValue(handlerInput.requestEnvelope, 'modo');
            sessionAttributes.modo = modo;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes)
        }
        
        let speakOutput, nuevoRecord;
        
        // código según el modo de juego elegido (practicar)
        if (sessionAttributes.modo === 'practicar' || sessionAttributes.modo === 'práctica') {
            
            // Si recibimos respuesta de la última pregunta formulada
            if (intent.slots.capital.value && practicando) {
                contador++;
                if (intent.slots.capital.value.toLowerCase() === capital.toLowerCase())
                    {
                        speakOutput = `correcto! `;
                        aciertos++;
                        sessionAttributes[capital] ? sessionAttributes[capital] += 1 : sessionAttributes[capital] = 1;
                        acertadas[capital] ? acertadas[capital] += 1 : acertadas[capital] = 1;
                    } else {
                            speakOutput = `la respuesta correcta era ${capital}. 
                            Vamos a repetir para que se nos quede. cuál es la capital de ${pais}?`;
            
                            // Si la usuaria ha fallado, le volvemos a preguntar la misma capital para que pueda aprendérsela
                            return handlerInput.responseBuilder
                                .speak(nuevoRecord ? nuevoRecord + speakOutput : speakOutput)
                                .reprompt(`Intenta decirme la capital de ${pais}`)
                                .getResponse();
                    }
                
                // Cuando el usuario ha respondido correctamente diez veces la misma capital
                if (sessionAttributes[capital] >= 21) {
                    
                    sessionAttributes['aprendidas'].push(capital);
                    
                    // buscar y añadir pais a un array de capitales aprendidas para que Alexa no siga preguntándola en el modo practicar
                }
                
                // Cuando el usuario ha respondido a cinco preguntas, el modo práctica termina
                if (contador >= 10) { 
                    speakOutput += `Has acertado en total ${aciertos} de 10 preguntas, ahora puedes seguir practicando o probar el modo desafío ` 
                    aciertos = 0;
                    contador = 0;
                    practicando = false;
                    sessionAttributes.modo = '';
                    
                                
                return handlerInput.responseBuilder
                    .speak(speakOutput)
                    .reprompt()
                    .getResponse();
                }
            }
            // comienzo modo PRACTICAR
            
            if (!practicando) {
                speakOutput = `'Vamos allá! `;
                practicando = true;
            }
            
            // Se elige un país y una capital al azar de capitales.js que no estén en aprendidas
            const aprendidas = sessionAttributes['aprendidas'];
            const porAprender = capitales.filter(elemento => !aprendidas.includes(elemento.capital));
            const randomIndex = Math.floor(Math.random() * (porAprender.length - 1));
            pais = porAprender[randomIndex].pais;
            capital = porAprender[randomIndex].capital;
        
            
            speakOutput += `cuál es la capital de ${pais}?`
            
            return handlerInput.responseBuilder
                    .speak(nuevoRecord ? nuevoRecord + speakOutput : speakOutput)
                    .reprompt(`Intenta decirme la capital de ${pais}`)
                    .getResponse();
                    
                    
        // código según el modo de juego elegido (desafio)
        } else if (sessionAttributes.modo === 'desafio' || sessionAttributes.modo === 'desafío') {
            
            if (intent.slots.capital.value && desafio) {
                if (intent.slots.capital.value.toLowerCase() === capital.toLowerCase() ) {
                     speakOutput = `correcto! `;
                     aciertos++;
                } else {
                     speakOutput = `la respuesta correcta era ${capital}. 
                                        Has logrado acertar ${aciertos}${aciertos === 1 ? 'a capital' : ' capitales seguidas'}.
                                        Ahora puedes intentar un desafío otra vez o practicar. ¿qué quieres? `
                    
                            // Determina el modo de juego que ha elegido la usuaria
                    if (!sessionAttributes.record || sessionAttributes.record < aciertos) {
                        speakOutput += 'Acabas de batir tu récord personal. Sigue así! '
                        sessionAttributes.record = aciertos;
                        handlerInput.attributesManager.setSessionAttributes(sessionAttributes)
                    }
                    
                    aciertos = 0;
                    desafio = false;
                    sessionAttributes.modo = '';
                    
                    return handlerInput.responseBuilder
                            .speak(speakOutput)
                            .reprompt()
                            .getResponse()
                }
            }
            // Si el modo desafío se está iniciando
            if (!desafio) {
                desafio = true;
                speakOutput = 'no te lo pondré fácil! ';
            } 
            
            // Se elige un país y una capital al azar de capitales.js
            const randomIndex = Math.floor(Math.random() * (capitales.length - 1))
            pais = capitales[randomIndex].pais;
            capital = capitales[randomIndex].capital;
            
                        
            speakOutput += `cuál es la capital de ${pais}?`
            
            return handlerInput.responseBuilder
                    .speak(speakOutput)
                    .reprompt(`Intenta decirme la capital de ${pais}`)
                    .getResponse();
        } 
        
        if (!intent.slots.modo.value) {
            return handlerInput.responseBuilder
            .speak('Necesito que elijas un modo de juego. Puedes practicar o atreverte con el modo desafío. ¿Qué te apetece? ')
            .reprompt()
            .getResponse();
        }

        }
    
};

const RestaurarIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RestaurarIntent';
    },
    handle(handlerInput) {
        practicando = false;
        desafio = false;
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        
        Object.keys(sessionAttributes).forEach( key => delete sessionAttributes[key]);
        
        sessionAttributes['aprendidas'] = [];
        sessionAttributes['record'] = 0;
        sessionAttributes['modo'] = '';
        
        const speakOutput = 'Has restaurado los datos a sus valores iniciales.'
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt()
            .getResponse();
    }
};

const SalirIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SalirIntent';
    },
    handle(handlerInput) {
        let speakOutput = 'No estás en ningún modo. ¿Cuál quieres? Puedes elegir entre practicar o el modo desafío.';
        if (practicando || desafio) {
            practicando = false;
            desafio = false;
            speakOutput = 'No te preocupes, aquí estaré cuando quieras seguir aprendiendo.';
        } 
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt()
            .getResponse();
    }
};

const NoIntentHandler = {
        canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'No te preocupes, aquí estaré para cuando te apetezca seguir aprendiendo';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = `Puedes aprender capitales conmigo eligiendo el modo práctica o el modo desafío. 
        Si necesitas salir del modo en el que estás, di salir de este modo. 
        También puedes restaurar a los parámetros iniciales diciendo simplemente restaurar. Esto reiniciará el récord del modo desafío y 
        en el modo practicar te volveré a preguntar las capitales que ya habías aprendido.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        practicando = false;
        desafio = false;
        const speakOutput = 'No te preocupes, aquí estaré cuando quieras seguir aprendiendo.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt()
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Hasta la próxima!';

        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.speak(speakOutput).getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Perdona, estaba un poco despistada, ¿me lo puedes volver a decir?`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const LoadAttributesRequestInterceptor = {
    async process(handlerInput) {
        const {attributesManager, requestEnvelope} = handlerInput;
        if (Alexa.isNewSession(requestEnvelope)){ //is this a new session? this check is not enough if using auto-delegate (more on next module)
            const persistentAttributes = await attributesManager.getPersistentAttributes() || {};
            console.log('Loading from persistent storage: ' + JSON.stringify(persistentAttributes));
            //copy persistent attribute to session attributes
            attributesManager.setSessionAttributes(persistentAttributes); // ALL persistent attributtes are now session attributes
        }
    }
};

// If you disable the skill and reenable it the userId might change and you loose the persistent attributes saved below as userId is the primary key
const SaveAttributesResponseInterceptor = {
    async process(handlerInput, response) {
        if (!response) return; // avoid intercepting calls that have no outgoing response due to errors
        const {attributesManager, requestEnvelope} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const shouldEndSession = (typeof response.shouldEndSession === "undefined" ? true : response.shouldEndSession); //is this a session end?
        if (shouldEndSession || Alexa.getRequestType(requestEnvelope) === 'SessionEndedRequest') { // skill was stopped or timed out
            // we increment a persistent session counter here
            sessionAttributes['sessionCounter'] = sessionAttributes['sessionCounter'] ? sessionAttributes['sessionCounter'] : 1;
            
            // guardamos el numero de veces que se ha respondido correctamente cada capital
            const entries = Object.entries(acertadas);
            for (const entry of entries) {
                sessionAttributes[entry[0]] = sessionAttributes[entry[0]] ? sessionAttributes[entry[0]] + entry[1] : 0;
            }
            
            // guardamos las capitales aprendidas
            sessionAttributes['aprendidas'] = sessionAttributes['aprendidas'] ? sessionAttributes['aprendidas'] : [];
            
            // record del modo desafío
            sessionAttributes['record'] = sessionAttributes['record'] ? sessionAttributes['record'] : 0;
             
            // we make ALL session attributes persistent
            console.log('Saving to persistent storage:' + JSON.stringify(sessionAttributes));
            attributesManager.setPersistentAttributes(sessionAttributes);
            await attributesManager.savePersistentAttributes();
        }
    }
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        JuegoIntentHandler,
        RestaurarIntentHandler,
        SalirIntentHandler,
        NoIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    .addRequestInterceptors(
        LoadAttributesRequestInterceptor
    )
    .addResponseInterceptors(
        SaveAttributesResponseInterceptor
    )
    .withPersistenceAdapter(persistenceAdapter)
    .lambda();

