#Copyright 2017-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

#Licensed under the Apache License, Version 2.0 (the "License").
#You may not use this file except in compliance with the License.
#A copy of the License is located at http://aws.amazon.com/apache2.0/ or in the "license" file accompanying this file.
#This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#See the License for the specific language governing permissions and limitations under the License.

import os

appname = raw_input("Enter a unique name for your app {pattern:^[a-z0-9]+$}:")

print("appname: "+appname)

print("Your appname:"+appname+" will be used for naming your CloudFormation stack, public s3 bucket and as a prefix as a prefix to identify all the Lambda functions, Cognito Pool and IAM Roles associated with your app")

pathinitial = "../Lambda/"
os.chdir(pathinitial)

#zip the Lambda function and node folders
print("Zipping the files that have to be uploaded to AWS Lambda")
zipcommand = "zip -q -r Archive.zip package.json node_modules/ xrayrekognition.js xraysearchceleb.js"
os.system(zipcommand)

#create s3 bucket to store the Archive
print("Creating S3 bucket that will have the Archive.zip file for AWS Lambda")
s3createcommand = "aws s3api create-bucket --acl private --bucket lambdacodexrayrekognition"
os.system(s3createcommand)

#upload Archive.zip to s3 bucket
print("Uploading Archive.zip to the S3 bucket")
s3uploadcommand = "aws s3 cp Archive.zip s3://lambdacodexrayrekognition"
os.system(s3uploadcommand)

#invoke the Cloudformation template
print("Deploying resources from the Cloudformation template")
pathcloudformation = "../Cloudformation"
os.chdir(pathcloudformation)

cfcommand = "aws cloudformation deploy --template-file xrayrekognitionyaml.template --stack-name "+appname+" --parameter-overrides appname="+appname+" --capabilities CAPABILITY_NAMED_IAM"
print(cfcommand)
os.system(cfcommand)

print("Completed deploying resources from the Cloudformation template.")

#delete bucket that has the lambda code
deletes3lambdabucket = "aws s3 rb s3://lambdacodexrayrekognition --force"
os.system(deletes3lambdabucket)

print("Deleted temporary s3 bucket")
