#!/usr/bin/env bash
docker run -d -p 9200:9200 -p 9300:9300 --name es4test elasticsearch:2
docker run -d -p 5671:5671 -p 5672:5672 -p 25672:25672  --name mq4test rabbitmq:3
