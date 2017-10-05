# AWS X-Ray with Amazon Rekognition

Table of Contents
=================

* [AWS X\-Ray with Amazon Rekognition](#aws-x-ray-with-amazon-rekognition)
  * [Before you begin](#before-you-begin)
  * [Overview](#overview)
  * [Setup instructions](#setup-instructions)
    * [a\. Deploy the resources from Cloudformation template](#a-deploy-the-resources-from-cloudformation-template)
    * [b\. Get the Cognito Identity Pool Id and update](#b-get-the-cognito-identity-pool-id-and-update)
    * [c\. Copy contents of the Client folder to the public S3 bucket](#c-copy-contents-of-the-client-folder-to-the-public-s3-bucket)
  * [Testing](#testing)
  * [Analyzing app using AWS X\-Ray](#analyzing-app-using-aws-x-ray)
    * [Analyzing AWS Lambda and Amazon Rekognition performance using AWS X\-Ray](#analyzing-aws-lambda-and-amazon-rekognition-performance-using-aws-x-ray)
      * [AWS Lambda initializing time analysis](#aws-lambda-initializing-time-analysis)
        * [AWS Lambda initializing time:](#aws-lambda-initializing-time)
        * [AWS Lambda on subsequent runs:](#aws-lambda-on-subsequent-runs)
      * [Amazon Rekognition time to analyze images](#amazon-rekognition-time-to-analyze-images)
      * [Amazon Rekognition time to analyze images with many faces](#amazon-rekognition-time-to-analyze-images-with-many-faces)
        * [Rekognition for image with 15 faces](#rekognition-for-image-with-15-faces)
        * [Rekognition for image with 10 faces](#rekognition-for-image-with-10-faces)
        * [Average response time for the whole function](#average-response-time-for-the-whole-function)
      * [No correlation on the number of times a celebrity face appears and time taken by Rekognition](#no-correlation-on-the-number-of-times-a-celebrity-face-appears-and-time-taken-by-rekognition)
      * [Amazon Rekognition image recognition errors](#amazon-rekognition-image-recognition-errors)
        * [Trace with error:](#trace-with-error)
        * [Trace with exception shown:](#trace-with-exception-shown)
  * [Delete resources and uninstall app](#delete-resources-and-uninstall-app)

## Before you begin
1. You will need an active AWS account to proceed. Create one at https://aws.amazon.com/ .
2. Permission to run Cloudformation template that will create S3 buckets, AWS Lambda function, IAM Roles and Cognito Identity Pools. Read more about Cloudformation from https://aws.amazon.com/cloudformation/ .
3. You will need Python to deploy the resources and run the sample app from these resources. Download and install Python from https://www.python.org/ .
4. You will need Node.js runtime to run the client from your local machine. Visit https://nodejs.org/en/ to install Node.js.

## Overview
1. User uses photoform.html to upload/delete photos in S3 bucket.
2. User on clicking "Recognize faces" in photoform.html button invokes a Lambda function that calls Amazon Rekognition.
3. AWS X-Ray tracks the performance of the Lambda function and Rekognition.
4. Photoform.html gets response on recognized celebrity faces from Rekognition.

![Alt text](/Documentation/architecture.png?raw=true "Sample app architecture")

## Setup instructions

### a. Deploy the resources from Cloudformation template
The Cloudformation template will create the required resources such as S3 buckets, IAM roles, AWS Lambda function and Cognito Identity Pools.

Go to the Cloudformation/ directory where you git-cloned the repository.
Run the following command to deploy the resources:
```
python install.py
```
Note: Your appname will be used for naming your CloudFormation stack, public s3 bucket and as a prefix as a prefix to identify all the Lambda functions, Cognito Pool and IAM Roles associated with your app.
### b. Get the Cognito Identity Pool Id and update
1. After the resources are deployed go to your Amazon Cognito console. Go to Federated Identity and go to "<appname>cognitounauthxrayrekognition" Idenity Pool to get the Identity Pool Id.

2. Update Client/xrayoperations.js file with the bucket name, region and Identity Pool Id. The bucket name will be your app's name followed by 'imagestoragexray'. For example, if your app name is cfx, then your albumBucketName will be cfx-imagestoragexray.

```js
var albumBucketName = '<appname-imagestoragexray>';//update this
var resourceregion = '<resource_region>';//update this
var IdentityPoolId = '<identity_pool_id>';//update this
```

### c. Copy contents of the Client folder to the public S3 bucket
Inorder to run the sample app you would have to copy the contents of the Client to the public S3 bucket that was created for you.

1. Run the following command to copy your photoform.html to your public bucket:
```
python uploadclient.py
```

2. Go to your public S3 bucket in your S3 console: https://s3.console.aws.amazon.com
3. Get your public S3 bucket's static endpoint from Properties->Static web hosting
4. Paste the endpoint in a browser to view and test the app.

## Testing
Once you have completed the setup instructions do the following:
1. Load the photoform.html either in your local browser or from the S3 bucket if you opted to statically host from S3.
2. Upload an image. This image will be stored in the S3 bucket under the album that you created for storing images.
3. Click "Recognize Faces" under the image. In a few seconds, you should be getting a comma-seperated response with the recognized celebrity faces in the image.

## Analyzing app using AWS X-Ray
AWS X-Ray will be useful in understanding the performance of your AWS Lambda function and Amazon Rekognition. You would notice that your AWS Lambda function and Amazon Rekognition take a longer time to process when the images you uploaded do not have a celebrity in them.

1. Go to your AWS X-Ray console (https://console.aws.amazon.com/xray/) and view the service map for your operation.
![Alt text](/Documentation/servicemap.png?raw=true "AWS X-Ray service map")
2. You can select each operation in the AWS X-Ray console and view the corresponding traces as well.
![Alt text](/Documentation/xraytrace.png?raw=true "AWS X-Ray traces")

### Analyzing AWS Lambda and Amazon Rekognition performance using AWS X-Ray
#### AWS Lambda initializing time analysis
You can use AWS X-Ray to determine the performance of your app and make it better. In the below image you can see that the first time your app calls AWS Lambda there is a 385ms time spent on initializing the AWS Lambda code. In the subsequent traces the AWS Lambda function is already initialized and you complete faster.
##### AWS Lambda initializing time:
![Alt text](/Documentation/initializetrace.png?raw=true "AWS X-Ray initial trace")
##### AWS Lambda on subsequent runs:
![Alt text](/Documentation/tracecorrect.png?raw=true "AWS X-Ray subsequent traces")

#### Amazon Rekognition time to analyze images
You can also notice the time taken by Amazon Rekognition differs with the ease of ability to find celebrity images in the photo. For example, a photo without any celebrity who could be recognized takes a shorter time to process compared to a photo with a celebrity who was able to be recognized. In image below, see the time taken to recognize Steve Jobs (1.6 sec) vs a random landscape image (714ms).
![Alt text](/Documentation/stevejobs-landscape.png?raw=true "AWS X-Ray Steve Jobs image comparison with a landscape image")

#### Amazon Rekognition time to analyze images with many faces
Amazon Rekognition takes more time to analyze images with more number of faces in them. For example, Rekognition took 9.2 sec to analyze an image with 15 faces Vs 6.2 sec for an image with 10 faces.
##### Rekognition for image with 15 faces
![Alt text](/Documentation/facecount15.png?raw=true "Rekognition for image with 15 faces")
##### Rekognition for image with 10 faces
![Alt text](/Documentation/facecount10.png?raw=true "Rekognition for image with 10 faces")
##### Average response time for the whole function
![Alt text](/Documentation/facecounts.png?raw=true "AWS X-Ray comparison of pic with many faces")

#### No correlation on the number of times a celebrity face appears and time taken by Rekognition
There was no correlation in the amount of time the sample app took to invoke Rekognition on all the images and return back with number of times a celebrity appeared in the images. A point to note is that every time the celebrity name is searched the sample app calls Rekognition on all the images one by one and the sample app analyzes the response from Rekognition and returns back with the number of times a celebrity's face was found in the images.

| Celebrity Name  | Number of times found | S3+Rekognition+Storing in array | S3 | Rekognition+Storing in array |
| ------------- | ------------- | ------------- | ------------ | ------------ |
| Steve Jobs  | 3  | 11.5 sec | 1.2 sec | 10.3 sec |
| Jeff Bezos  | 2 | 11.1  | 0.6 | 10.5 sec |
| Bill Gates | 4 | 11.5 | 1.0 | 10.5 sec |
| Tim Cook | 4 | 10.5 | 0.541 | 9.959 sec |

![Alt text](/Documentation/celebrityoccurence.png?raw=true "AWS X-Ray comparison of occurence of celebrity face in all images")

#### Amazon Rekognition image recognition errors
There are times when your image recognition will fail as well. AWS X-Ray helps you trace these errors and provides the errors clearly from Amazon Rekognition.
##### Trace with error:
![Alt text](/Documentation/traceerror.png?raw=true "AWS X-Ray traces")

##### Trace with exception shown:
![Alt text](/Documentation/traceexception.png?raw=true "AWS X-Ray traces")
![Alt text](/Documentation/traceexception1.png?raw=true "AWS X-Ray traces")

## Delete resources and uninstall app
Run the following command to delete resources and uninstall the sample app:
```
python uninstall.py
```
You can go to your Cloudformation console: https://console.aws.amazon.com/cloudformation and click "xrayrekognitionstack" stack to see if deleting resources failed. In case the stack failed to delete resources you can manually delete the resources listed under that stack.
