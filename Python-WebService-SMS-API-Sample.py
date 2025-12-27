# -*- coding: utf-8 -*-
"""
Created on Tue Feb  2 14:20:17 2021

@author: Fatat Saleh
"""
import requests

BaseAddress = "http://www.payamak.vip/api/v1/RestWebApi/"
userName='T.09133569976'
password='vpk$398'

def rest_test_get_credit():
    url=BaseAddress+'GetCredit'
    data = {'userName': userName,
            'password': password
            }
    response = requests.post(url,json=data,headers={"Content-Type": "application/json"})
    print(response.text)

def rest_test_get_batch_delivery():
    url=BaseAddress+'GetBatchDelivery'
    data={'userName': userName ,
          'password': password ,
          'batchSmsId': '139423920',
          'index': 1 ,
          'count': 2 
          }
    response = requests.post(url,json=data,headers={"Content-Type": "application/json"})
    print(response.text)
    
def rest_test_get_sender_numbers():
    url=BaseAddress+'GetSenderNumbers'
    data={'userName': userName ,
          'password': password 
          }
    response = requests.post(url,json=data,headers={"Content-Type": "application/json"})
    print(response.text)
def rest_test_get_delivery_like_to_like():
    url=BaseAddress+'GetDeliveryLikeToLike'
    data={'userName': userName ,
          'password': password ,
          'smsId': '23660'
          }
    response = requests.post(url,json=data,headers={"Content-Type": "application/json"})
    print(response.text)

def rest_test_extract_telecom_black_list_numbers():
    url=BaseAddress+'ExtractTelecomBlacklistNumbers'
    data={'userName': userName ,
          'password': password ,
          'numbers':'09123456789,09381234567' 
          }
    response = requests.post(url,json=data,headers={"Content-Type": "application/json"})
    print(response.text)

def rest_test_number_is_in_telecom_black_list():
    url=BaseAddress+'NumberIsInTelecomBlacklist'
    data={'userName': userName ,
          'password': password ,
          'number': '09381234567'
          }
    response = requests.post(url,json=data,headers={"Content-Type": "application/json"})
    print(response.text)
    
def  rest_test_check_sms_content():
    url=BaseAddress+'CheckSmsContent'
    data={'userName': userName ,
          'password': password ,
          'message': 'تست'
          }
    response = requests.post(url,json=data,headers={"Content-Type": "application/json"})
    print(response.text)
    
def  rest_test_send_sms():
    url=BaseAddress+'SendBatchSms'
    data={'userName': userName ,
          'password': password ,
          'fromNumber':'500025799991',
          'toNumbers':'09121234567',
          'messageContent':'سلا00م ',
          'isFlash':False,
          'sendDelay':0
          }
    response = requests.post(url,json=data,headers={"Content-Type": "application/json"})
    print(response.text)
def rest_test_get_messages_by_date_range():
    url=BaseAddress+'GetMessagesByDateRange'
    data={'userName': userName ,
          'password': password ,
          'messageType': '2' ,
          'fromNumbers': '10002188880678,10002188' ,
          'fromDate': '2020/09/01',
          "toDate": '2020/09/02'
          }
    response = requests.post(url,json=data,headers={"Content-Type": "application/json"})
    print(response.text)
if __name__ == "__main__":
    print('****credit****')
    rest_test_get_credit()
    print('****batch_delivery****')
    rest_test_get_batch_delivery()
    print('****sender_numbers****')
    rest_test_get_sender_numbers()
    print('****GetDeliveryLikeToLike****')
    rest_test_get_delivery_like_to_like()
    print('****ExtractTelecomBlacklistNumbers****')
    rest_test_extract_telecom_black_list_numbers()
    print('****NumberIsInTelecomBlacklist****')
    rest_test_number_is_in_telecom_black_list()
    print('****CheckSmsContent****')
    rest_test_check_sms_content()
    print('****SendBatchSms****')
    rest_test_send_sms()
    print('****GetMessagesByDateRange****')
    rest_test_get_messages_by_date_range()
    
    