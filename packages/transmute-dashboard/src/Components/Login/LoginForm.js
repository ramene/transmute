import React from 'react';
import classNames from 'classnames';
import OktaAuth from '@okta/okta-auth-js';
import { withAuth } from '@okta/okta-react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import Button from 'material-ui/Button';
import Input, { InputLabel } from 'material-ui/Input';
import { FormControl, FormHelperText } from 'material-ui/Form';

import { loginApiCall } from '../../actions/User';

const styles = theme => ({
  button: {
    margin: theme.spacing.unit,
  },
  root: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  margin: {
    margin: theme.spacing.unit,
  },
  textField: {
    flexBasis: 200,
  },
});

class LoginForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      email: '',
      password: ''
    }

    this.oktaAuth = new OktaAuth({ url: props.baseUrl });
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  handleSubmit(e) {
    e.preventDefault();
    this.props.loginApiCall(this.oktaAuth, this.state.email, this.state.password);
  }

  handleChange = name => event => {
    this.setState({
      [name]: event.target.value,
    });
  };

  render() {
    const { classes } = this.props;

    if (this.props.sessionToken) {
      this.props.auth.redirect({ sessionToken: this.props.sessionToken });
    }

    const errorMessage = this.props.error ?
      <span className="error-message">{this.props.error}</span> :
      null;

    return (
      <div className={classes.root}>
        <FormControl className={classNames(classes.margin, classes.textField)}>
          <InputLabel htmlFor="adornment-password">Email</InputLabel>
          <Input
            id="email"
            type='email'
            value={this.state.email}
            onChange={this.handleChange('email')}
          />
        </FormControl>
        <FormControl className={classNames(classes.margin, classes.textField)}>
          <InputLabel htmlFor="adornment-password">Password</InputLabel>
          <Input
            id="password"
            type='password'
            value={this.state.password}
            onChange={this.handleChange('password')}
          />
        </FormControl>
        <Button
          variant="raised"
          color="secondary"
          disabled={this.state.email.trim().length === 0 || this.state.password.trim().length === 0}
          className={classes.button}
          onClick={this.handleSubmit}>
          Submit
        </Button>
      </div>
    );
  }
}

LoginForm.propTypes = {
  classes: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => {
  return {
    sessionToken: state.user.sessionToken,
    error: state.user.error
  }
};

const mapDispatchToProps = dispatch => {
  return {
    loginApiCall: (oktaAuth, email, password) => dispatch(loginApiCall(oktaAuth, email, password))
  }
};

// We need an intermediary variable for handling the recursive nesting.
export default withStyles(styles)(connect(
  mapStateToProps,
  mapDispatchToProps
)(withAuth(LoginForm)));
