const Alexa = require('ask-sdk-core');

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const { permissions } = handlerInput.requestEnvelope.context.System.user;

    if (!permissions) {

      handlerInput.responseBuilder
        .speak("This skill needs permission to access your reminders.")
        .addDirective({
          type: "Connections.SendRequest",
          name: "AskFor",
          payload: {
            "@type": "AskForPermissionsConsentRequest",
            "@version": "1",
            "permissionScope": "alexa::alerts:reminders:skill:readwrite"
          },
          token: ""
        });

    } else {
      handlerInput.responseBuilder
        .speak("Hello. You can say 'remind me' to set a reminder.")
        .reprompt("Say: 'remind me' to set a reminder.")
    }

    return handlerInput.responseBuilder
      .getResponse();
  }
};

const ConnectionsResponsetHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Connections.Response';
  },
  handle(handlerInput) {
    const { permissions } = handlerInput.requestEnvelope.context.System.user;

    //console.log(JSON.stringify(handlerInput.requestEnvelope));
    //console.log(handlerInput.requestEnvelope.request.payload.status);

    const status = handlerInput.requestEnvelope.request.payload.status;


    if (!permissions) {
      return handlerInput.responseBuilder
        .speak("I didn't hear your answer. This skill requires your permission.")
        .addDirective({
          type: "Connections.SendRequest",
          name: "AskFor",
          payload: {
            "@type": "AskForPermissionsConsentRequest",
            "@version": "1",
            "permissionScope": "alexa::alerts:reminders:skill:readwrite"
          },
          token: "user-id-could-go-here"
        })
        .getResponse();
    }

    switch (status) {
      case "ACCEPTED":
        handlerInput.responseBuilder
          .speak("Now that you've provided permission - you can say: set a reminder.")
          .reprompt('To set a reminder say: set a reminder.')
        break;
      case "DENIED":
        handlerInput.responseBuilder
          .speak("Without permissions, I can't set a reminder. So I guess that's goodbye.");
        break;
      case "NOT_ANSWERED":

        break;
      default:
        handlerInput.responseBuilder
          .speak("Now that you've provided permission - you can say: set a reminder.")
          .reprompt('To set a reminder say: set a reminder.')
    }

    return handlerInput.responseBuilder
      .getResponse();
  }
};

const CreateReminderIntentHandler = {
  canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;
    return request.type === 'IntentRequest' && request.intent.name === 'CreateReminderIntent';
  },
  async handle(handlerInput) {
    const { requestEnvelope, serviceClientFactory, responseBuilder } = handlerInput;
    const consentToken = requestEnvelope.context.System.user.permissions
      && requestEnvelope.context.System.user.permissions.consentToken;
    if (!consentToken) {
      return responseBuilder
        .speak('Please enable reminders permission in the Amazon Alexa app.')
        .withAskForPermissionsConsentCard(['alexa::alerts:reminders:skill:readwrite'])
        .getResponse();
    }

    try {
      const speechText = "Alright! I've scheduled a reminder for you.";

      const ReminderManagementServiceClient = serviceClientFactory.getReminderManagementServiceClient();
      const reminderPayload = {
        "trigger": {
          "type": "SCHEDULED_RELATIVE",
          "offsetInSeconds": "10",
          "timeZoneId": "America/New_York"
        },
        "alertInfo": {
          "spokenInfo": {
            "content": [{
              "locale": "en-US",
              "text": "learn about reminders"
            }]
          }
        },
        "pushNotification": {
          "status": "ENABLED"
        }
      };

      await ReminderManagementServiceClient.createReminder(reminderPayload);
      return responseBuilder
        .speak(speechText)
        .getResponse();

    } catch (error) {
      console.error(error);
      return responseBuilder
        .speak('Something went wrong.')
        .getResponse();
    }
  }
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
        || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speakOutput = 'Goodbye!';
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  }
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    // Any cleanup logic goes here.
    return handlerInput.responseBuilder.getResponse();
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speakOutput = 'You can say hello to me! How can I help?';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};

const IntentReflectorHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
  },
  handle(handlerInput) {
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    const speakOutput = `You just triggered ${intentName}`;

    return handlerInput.responseBuilder
      .speak(speakOutput)
      //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
      .getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`~~~~ Error handled: ${error.stack}`);
    const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    ConnectionsResponsetHandler,
    CreateReminderIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
  )
  .addErrorHandlers(
    ErrorHandler,
  )
  .withApiClient(new Alexa.DefaultApiClient())
  .lambda();
