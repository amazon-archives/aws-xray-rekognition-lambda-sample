#Copyright 2017-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

#Licensed under the Apache License, Version 2.0 (the "License").
#You may not use this file except in compliance with the License.
#A copy of the License is located at http://aws.amazon.com/apache2.0/ or in the "license" file accompanying this file.
#This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#See the License for the specific language governing permissions and limitations under the License.

import os

#Empty all s3 buckets first
deletepublicbucketfiles = "aws s3 rm s3://publicbucketxray --recursive --only-show-errors"
os.system(deletepublicbucketfiles)

deleteimages = "aws s3 rm s3://imagestoragexray --recursive --only-show-errors"
os.system(deleteimages)

#delete cloudformation stack
deletecloudformationstack = "aws cloudformation delete-stack --stack-name xrayrekognitionstack"
os.system(deletecloudformationstack)
