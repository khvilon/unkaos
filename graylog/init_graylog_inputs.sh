#!/bin/bash
set -e  # Прерывать выполнение при ошибках
set -x  # Для отладки

# Ожидание запуска Graylog API
until $(curl --output /dev/null --silent --head --fail http://graylog:9000/api/system/inputs); do
    echo "Waiting for Graylog API..."
    sleep 5
done

# Установка логина и пароля
USERNAME="admin"
PASSWORD="admin"

# Создание GELF UDP входа
curl -u "${USERNAME}:${PASSWORD}" -H 'Content-Type: application/json' -X POST 'http://graylog:9000/api/system/inputs' -d '{
  "title": "GELF UDP Input",
  "type": "org.graylog2.inputs.gelf.udp.GELFUDPInput",
  "global": true,
  "configuration": {
    "bind_address": "0.0.0.0",
    "port": 12201,
    "recv_buffer_size": 262144
  }
}' || echo "Failed to create GELF UDP input"

# Создание GELF TCP входа
curl -u "${USERNAME}:${PASSWORD}" -H 'Content-Type: application/json' -X POST 'http://graylog:9000/api/system/inputs' -d '{
  "title": "GELF TCP Input",
  "type": "org.graylog2.inputs.gelf.tcp.GELFTCPInput",
  "global": true,
  "configuration": {
    "bind_address": "0.0.0.0",
    "port": 12201,
    "recv_buffer_size": 1048576,
    "tcp_keepalive": false,
    "use_null_delimiter": true
  }
}' || echo "Failed to create GELF TCP input"
