package aws

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

type Dynamo struct {
	Client *dynamodb.Client
}

func NewDynamo(ctx context.Context, region string) *Dynamo {
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		panic("unable to load AWS SDK config: " + err.Error())
	}

	return &Dynamo{
		Client: dynamodb.NewFromConfig(cfg),
	}
}
