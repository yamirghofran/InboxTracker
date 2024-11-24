# !/bin/bash


# 1) Setting up locally

mkdir backend
cd backend

export RESOURCE_GROUP="CC_A_7"
export STORAGE_ACCOUNT_NAME="theboyz0"
export FUNCTION_APP_NAME="InboxTracker"

func AzureFunctions init --python -m V2
cd AzureFunctions

func new --template "Http Trigger" --name "CreateExpense" --auth-level "Function" # We created a single function and added all others inside its module; Done to concentrate all serverless funcs code in a single place.
pip3 install --no-cache-dir -r requirements.txt

# 2) Logging in Azure
az login --use-device-code
az account set
az account list --output table # Check if the account is set correctly

# Creating storage account
az storage account create --name $STORAGE_ACCOUNT_NAME \
      --resource-group $RESOURCE_GROUP \
      --sku "Standard_LRS"


# Creating function app
az functionapp create --consumption-plan-location "francecentral" \
      --resource-group $RESOURCE_GROUP \
      --runtime "python:3.9" \
      --functions-version 4 \
      --name $FUNCTION_APP_NAME \
      --storage-account $STORAGE_ACCOUNT_NAME \
      --os-type "linux"

# 3) Testing locally
func azure functionapp fetch-app-settings $FUNCTION_APP_NAME
port=$RANDOM
func start --port $port
curl http://localhost:$port/api/GetExpenses # Examples for one possible endpoint


# 4) Deploying the function app
func azure functionapp publish $FUNCTION_APP_NAME --python
func azure functionapp publish $FUNCTION_APP_NAME --publish-settings-only   