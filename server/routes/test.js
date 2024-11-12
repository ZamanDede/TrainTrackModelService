const AWS = require('aws-sdk');
AWS.config.update({ region: 'ap-southeast-2' });

const sqs = new AWS.SQS();
const params = {
  QueueUrl: 'https://sqs.ap-southeast-2.amazonaws.com/901444280953/n11357428-ModelProcessingQueue',
  MessageBody: 'Test message',
};

sqs.sendMessage(params, (err, data) => {
  if (err) {
    console.error('Error sending message:', err);
  } else {
    console.log('Message sent successfully:', data.MessageId);
  }
});
