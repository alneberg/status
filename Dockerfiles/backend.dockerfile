FROM python:3.9-alpine

RUN apk update && apk upgrade

# Copy the content to a code folder in container
COPY ./requirements.txt /code/requirements.txt

# Install all dependencies
RUN python -m pip install -e /code/requirements.txt

# Copy the content to a code folder in container
COPY . /code

# Add code directory in pythonpath
ENV PYTHONPATH /code

WORKDIR /code/run_dir/

CMD ["python", "../status_app.py", "--testing-mode"]