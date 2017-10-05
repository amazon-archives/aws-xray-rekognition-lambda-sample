#Copyright 2017-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

#Licensed under the Apache License, Version 2.0 (the "License").
#You may not use this file except in compliance with the License.
#A copy of the License is located at http://aws.amazon.com/apache2.0/ or in the "license" file accompanying this file.
#This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#See the License for the specific language governing permissions and limitations under the License.

import os

appname = raw_input("Enter your app name {pattern:^[a-z0-9]+$}:")

#Empty all s3 buckets first
deletepublicbucketfiles = "aws s3 rm s3://"+appname+" --recursive --only-show-errors"
print(deletepublicbucketfiles)
os.system(deletepublicbucketfiles)
print("Deleted the public s3 bucket")

#Deleting s3 bucket with images
deleteimages = "aws s3 rm s3://"+appname+"-imagestoragexray --recursive --only-show-errors"
print(deleteimages)
os.system(deleteimages)
print("Deleted s3 bucket with images")

#delete cloudformation stack
deletecloudformationstack = "aws cloudformation delete-stack --stack-name "+appname
print(deletecloudformationstack)
os.system(deletecloudformationstack)
print("Deleted your app's CloudFormation stack. Please verify whether the stack is completely deleted by logging in to your CloudFormation console at https://console.amazon.com/cloudformation")
