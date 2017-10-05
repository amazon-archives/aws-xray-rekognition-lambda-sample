#Copyright 2017-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

#Licensed under the Apache License, Version 2.0 (the "License").
#You may not use this file except in compliance with the License.
#A copy of the License is located at http://aws.amazon.com/apache2.0/ or in the "license" file accompanying this file.
#This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#See the License for the specific language governing permissions and limitations under the License.

import os

appname = raw_input("Enter your app name:")

#Copy over the client code to the public S3 bucket
pathclient = "../"
os.chdir(pathclient)
clientcodecopycommand = "aws s3 cp Client s3://"+appname+" --recursive --exclude \"*.DS_Store\" --acl=public-read"
os.system(clientcodecopycommand)
